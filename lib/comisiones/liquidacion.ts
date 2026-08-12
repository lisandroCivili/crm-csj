import type { ComisionEstado } from "@/lib/generated/prisma/client";
import { db } from "@/lib/db";
import {
  calcularComisionPeriodo,
  type FilaEscala,
  type GrupoComision,
  type TramoAplicado,
} from "./calcularComisionPeriodo";
import { rangoDelPeriodo } from "./periodo";

/**
 * Capa de datos de la liquidacion: arma la entrada del motor desde la base y
 * persiste el resultado. El calculo en si vive en `calcularComisionPeriodo`,
 * que es puro a proposito.
 *
 * QUE CUOTA ENTRA EN QUE PERIODO
 *
 * El corte es `detectadaPagaAt`: el momento en que el sistema vio la cuota
 * pagada por primera vez, sellado durante la importacion del padron. No se usa
 * `fechaPago` porque el padron llega desfasado (las ventas de un mes entran al
 * sorteo del mes siguiente y el padron de ese ciclo llega unos diez dias
 * despues), y la comision se devenga cuando el club confirma el cobro.
 *
 * Efecto conocido: la primera importacion sella como "recien detectadas" todas
 * las cuotas historicas que ya venian pagadas, asi que ese primer periodo queda
 * inflado. La pantalla de liquidacion lo avisa.
 */

export type RenglonLiquidacion = Omit<GrupoComision, "cuotaIds">;

export type LineaLiquidacion = {
  vendedorId: string;
  nombreCompleto: string;
  codigo: string;
  activo: boolean;
  topeCuotasComision: number;
  ventasNuevas: number;
  tramo: TramoAplicado | null;
  renglones: RenglonLiquidacion[];
  cuotasFueraDeTope: number;
  baseFueraDeTope: number;
  totalComisionCuotas: number;
  gastosRepresentacion: number;
  totalComision: number;
  advertencias: string[];
  estado: ComisionEstado;
  fechaCierre: Date | null;
};

export type Liquidacion = {
  periodo: string;
  /** CERRADO cuando ya se cerro y los porcentajes quedaron congelados. */
  estado: ComisionEstado;
  /** true si todavia no hay ninguna escala cargada: no se puede liquidar. */
  sinEscalas: boolean;
  lineas: LineaLiquidacion[];
  totales: {
    ventasNuevas: number;
    comisionCuotas: number;
    gastos: number;
    total: number;
  };
};

// ---------------------------------------------------------------------------
// Lectura
// ---------------------------------------------------------------------------

export async function listarEscalas(): Promise<FilaEscala[]> {
  const filas = await db.escalaComision.findMany({
    orderBy: [{ ventasMin: "asc" }, { numeroCuota: "asc" }],
  });

  return filas.map((fila) => ({
    ventasMin: fila.ventasMin,
    ventasMax: fila.ventasMax,
    numeroCuota: fila.numeroCuota,
    porcentaje: Number(fila.porcentaje),
  }));
}

/** Cuotas que el padron mostro recien cobradas dentro del periodo. */
async function cuotasCobradas(zonaId: number, periodo: string, vendedorId?: string) {
  const { desde, hasta } = rangoDelPeriodo(periodo);

  const cuotas = await db.tituloCuota.findMany({
    where: {
      detectadaPagaAt: { gte: desde, lt: hasta },
      titulo: {
        zonaId,
        ...(vendedorId ? { vendedorId } : { vendedorId: { not: null } }),
      },
    },
    select: {
      id: true,
      numeroCuota: true,
      importe: true,
      titulo: { select: { vendedorId: true } },
    },
  });

  const porVendedor = new Map<string, { id: string; numeroCuota: number; importe: number }[]>();

  for (const cuota of cuotas) {
    const id = cuota.titulo.vendedorId;
    if (!id) continue;
    const lista = porVendedor.get(id) ?? [];
    lista.push({
      id: cuota.id,
      numeroCuota: cuota.numeroCuota,
      importe: Number(cuota.importe),
    });
    porVendedor.set(id, lista);
  }

  return porVendedor;
}

type Guardado = {
  estado: ComisionEstado;
  fechaCierre: Date | null;
  gastosRepresentacion: number;
  ventasDelPeriodo: number;
  totalComisionCuotas: number;
  totalComision: number;
  renglones: RenglonLiquidacion[];
};

async function periodosGuardados(zonaId: number, periodo: string) {
  const registros = await db.comisionPeriodo.findMany({
    where: { zonaId, periodo },
    include: { detalles: { orderBy: { numeroCuota: "asc" } } },
  });

  return new Map<string, Guardado>(
    registros.map((registro) => [
      registro.vendedorId,
      {
        estado: registro.estado,
        fechaCierre: registro.fechaCierre,
        gastosRepresentacion: Number(registro.gastosRepresentacion),
        ventasDelPeriodo: registro.ventasDelPeriodo,
        totalComisionCuotas: Number(registro.totalComisionCuotas),
        totalComision: Number(registro.totalComision),
        renglones: registro.detalles.map((detalle) => ({
          numeroCuota: detalle.numeroCuota,
          cantidadCuotas: detalle.cantidadCuotas,
          baseCalculo: Number(detalle.baseCalculo),
          porcentajeAplicado: Number(detalle.porcentajeAplicado),
          monto: Number(detalle.monto),
        })),
      },
    ])
  );
}

type DatosVendedor = {
  id: string;
  nombreCompleto: string;
  codigo: string;
  activo: boolean;
  topeCuotasComision: number;
};

/**
 * Una linea de la liquidacion. Si el periodo del vendedor ya esta cerrado se
 * devuelve tal como quedo guardado; si no, se recalcula contra el padron.
 */
function armarLinea({
  vendedor,
  guardado,
  cuotas,
  escalas,
}: {
  vendedor: DatosVendedor;
  guardado: Guardado | undefined;
  cuotas: { id: string; numeroCuota: number; importe: number }[];
  escalas: FilaEscala[];
}): LineaLiquidacion {
  const base = {
    vendedorId: vendedor.id,
    nombreCompleto: vendedor.nombreCompleto,
    codigo: vendedor.codigo,
    activo: vendedor.activo,
    topeCuotasComision: vendedor.topeCuotasComision,
  };

  if (guardado && guardado.estado === "CERRADO") {
    return {
      ...base,
      ventasNuevas: guardado.ventasDelPeriodo,
      tramo: null,
      renglones: guardado.renglones,
      cuotasFueraDeTope: 0,
      baseFueraDeTope: 0,
      totalComisionCuotas: guardado.totalComisionCuotas,
      gastosRepresentacion: guardado.gastosRepresentacion,
      totalComision: guardado.totalComision,
      advertencias: [],
      estado: guardado.estado,
      fechaCierre: guardado.fechaCierre,
    };
  }

  const resultado = calcularComisionPeriodo({
    cuotas,
    escalas,
    topeCuotasComision: vendedor.topeCuotasComision,
    gastosRepresentacion: guardado?.gastosRepresentacion ?? 0,
  });

  return {
    ...base,
    ventasNuevas: resultado.ventasNuevas,
    tramo: resultado.tramo,
    // Los ids de las cuotas no viajan a la pantalla: el renglon se muestra
    // agrupado y el detalle cuota por cuota se consulta aparte.
    renglones: resultado.grupos.map((grupo) => ({
      numeroCuota: grupo.numeroCuota,
      cantidadCuotas: grupo.cantidadCuotas,
      baseCalculo: grupo.baseCalculo,
      porcentajeAplicado: grupo.porcentajeAplicado,
      monto: grupo.monto,
    })),
    cuotasFueraDeTope: resultado.cuotasFueraDeTope,
    baseFueraDeTope: resultado.baseFueraDeTope,
    totalComisionCuotas: resultado.totalComisionCuotas,
    gastosRepresentacion: resultado.gastosRepresentacion,
    totalComision: resultado.totalComision,
    advertencias: resultado.advertencias,
    estado: guardado?.estado ?? "BORRADOR",
    fechaCierre: guardado?.fechaCierre ?? null,
  };
}

/**
 * La liquidacion del periodo para toda la zona.
 *
 * Mientras esta en borrador se recalcula en vivo contra el padron, asi que
 * importar un padron nuevo se refleja al instante. Una vez cerrado se muestra
 * lo persistido, con los porcentajes congelados: si Balta despues corrige la
 * escala, los periodos ya cerrados no se mueven.
 */
export async function obtenerLiquidacion({
  zonaId,
  periodo,
}: {
  zonaId: number;
  periodo: string;
}): Promise<Liquidacion> {
  const [vendedores, escalas, cuotasPorVendedor, guardados] = await Promise.all([
    db.vendedor.findMany({
      where: { zonaId },
      orderBy: [{ activo: "desc" }, { nombreCompleto: "asc" }],
      select: {
        id: true,
        nombreCompleto: true,
        codigo: true,
        activo: true,
        topeCuotasComision: true,
      },
    }),
    listarEscalas(),
    cuotasCobradas(zonaId, periodo),
    periodosGuardados(zonaId, periodo),
  ]);

  const lineas: LineaLiquidacion[] = vendedores.map((vendedor) =>
    armarLinea({
      vendedor,
      guardado: guardados.get(vendedor.id),
      cuotas: cuotasPorVendedor.get(vendedor.id) ?? [],
      escalas,
    })
  );

  // El periodo esta cerrado solo si TODO lo que hay para liquidar quedo
  // congelado. Si despues del cierre entra un padron que le suma cuotas a
  // alguien, esa linea nace en borrador y el periodo vuelve a pedir cierre.
  const conMovimiento = lineas.filter(
    (linea) => linea.renglones.length > 0 || linea.gastosRepresentacion > 0
  );
  const cerrado =
    conMovimiento.length > 0 && conMovimiento.every((linea) => linea.estado === "CERRADO");

  return {
    periodo,
    estado: cerrado ? "CERRADO" : "BORRADOR",
    sinEscalas: escalas.length === 0,
    lineas,
    totales: {
      ventasNuevas: lineas.reduce((suma, linea) => suma + linea.ventasNuevas, 0),
      comisionCuotas: redondear(
        lineas.reduce((suma, linea) => suma + linea.totalComisionCuotas, 0)
      ),
      gastos: redondear(lineas.reduce((suma, linea) => suma + linea.gastosRepresentacion, 0)),
      total: redondear(lineas.reduce((suma, linea) => suma + linea.totalComision, 0)),
    },
  };
}

function redondear(pesos: number): number {
  return Math.round(pesos * 100) / 100;
}

/**
 * Las cuotas concretas que componen la liquidacion de un vendedor. Sirve para
 * auditar un renglon: de que titulo y de que cliente salio cada peso.
 */
export async function cuotasDelPeriodo({
  vendedorId,
  zonaId,
  periodo,
  limite = 300,
}: {
  vendedorId: string;
  zonaId: number;
  periodo: string;
  limite?: number;
}) {
  const { desde, hasta } = rangoDelPeriodo(periodo);

  return db.tituloCuota.findMany({
    where: {
      detectadaPagaAt: { gte: desde, lt: hasta },
      titulo: { zonaId, vendedorId },
    },
    orderBy: [{ numeroCuota: "asc" }, { detectadaPagaAt: "asc" }],
    take: limite,
    select: {
      id: true,
      numeroCuota: true,
      importe: true,
      fechaPago: true,
      detectadaPagaAt: true,
      titulo: {
        select: { numTit: true, cliente: { select: { nombre: true } } },
      },
    },
  });
}

/**
 * La liquidacion de un solo vendedor: la usa su dashboard y la pantalla de
 * detalle. Consulta solo sus cuotas en vez de las de toda la zona.
 */
export async function obtenerLiquidacionVendedor({
  vendedorId,
  zonaId,
  periodo,
}: {
  vendedorId: string;
  zonaId: number;
  periodo: string;
}): Promise<LineaLiquidacion | null> {
  const vendedor = await db.vendedor.findFirst({
    where: { id: vendedorId, zonaId },
    select: {
      id: true,
      nombreCompleto: true,
      codigo: true,
      activo: true,
      topeCuotasComision: true,
    },
  });
  if (!vendedor) return null;

  const [escalas, porVendedor, guardados] = await Promise.all([
    listarEscalas(),
    cuotasCobradas(zonaId, periodo, vendedorId),
    periodosGuardados(zonaId, periodo),
  ]);

  return armarLinea({
    vendedor,
    guardado: guardados.get(vendedorId),
    cuotas: porVendedor.get(vendedorId) ?? [],
    escalas,
  });
}

// ---------------------------------------------------------------------------
// Escritura
// ---------------------------------------------------------------------------

/**
 * Cierra el periodo de toda la zona: congela los porcentajes en
 * `ComisionDetalle` y deja los registros en CERRADO.
 */
export async function cerrarPeriodo({
  zonaId,
  periodo,
}: {
  zonaId: number;
  periodo: string;
}): Promise<{ vendedoresCerrados: number; total: number }> {
  const liquidacion = await obtenerLiquidacion({ zonaId, periodo });

  // Un vendedor sin cuotas cobradas ni gastos no genera registro: no tiene
  // sentido llenar la base de periodos en cero.
  const aCerrar = liquidacion.lineas.filter(
    (linea) => linea.renglones.length > 0 || linea.gastosRepresentacion > 0
  );

  const ahora = new Date();

  await db.$transaction(async (tx) => {
    for (const linea of aCerrar) {
      const registro = await tx.comisionPeriodo.upsert({
        where: { vendedorId_periodo: { vendedorId: linea.vendedorId, periodo } },
        update: {
          zonaId,
          ventasDelPeriodo: linea.ventasNuevas,
          totalComisionCuotas: linea.totalComisionCuotas,
          gastosRepresentacion: linea.gastosRepresentacion,
          totalComision: linea.totalComision,
          estado: "CERRADO",
          fechaCierre: ahora,
        },
        create: {
          vendedorId: linea.vendedorId,
          periodo,
          zonaId,
          ventasDelPeriodo: linea.ventasNuevas,
          totalComisionCuotas: linea.totalComisionCuotas,
          gastosRepresentacion: linea.gastosRepresentacion,
          totalComision: linea.totalComision,
          estado: "CERRADO",
          fechaCierre: ahora,
        },
        select: { id: true },
      });

      // El detalle se reescribe entero: el cierre es la foto definitiva.
      await tx.comisionDetalle.deleteMany({ where: { comisionPeriodoId: registro.id } });

      if (linea.renglones.length > 0) {
        await tx.comisionDetalle.createMany({
          data: linea.renglones.map((renglon) => ({
            comisionPeriodoId: registro.id,
            numeroCuota: renglon.numeroCuota,
            cantidadCuotas: renglon.cantidadCuotas,
            baseCalculo: renglon.baseCalculo,
            porcentajeAplicado: renglon.porcentajeAplicado,
            monto: renglon.monto,
          })),
        });
      }
    }
  });

  return { vendedoresCerrados: aCerrar.length, total: liquidacion.totales.total };
}

/** Vuelve el periodo a borrador para poder recalcularlo. */
export async function reabrirPeriodo({ zonaId, periodo }: { zonaId: number; periodo: string }) {
  await db.comisionPeriodo.updateMany({
    where: { zonaId, periodo, estado: "CERRADO" },
    data: { estado: "BORRADOR", fechaCierre: null },
  });
}

/** Los periodos que ya tienen algun registro, del mas nuevo al mas viejo. */
export async function periodosConMovimiento(zonaId: number): Promise<string[]> {
  const filas = await db.comisionPeriodo.findMany({
    where: { zonaId },
    distinct: ["periodo"],
    orderBy: { periodo: "desc" },
    select: { periodo: true },
  });
  return filas.map((fila) => fila.periodo);
}
