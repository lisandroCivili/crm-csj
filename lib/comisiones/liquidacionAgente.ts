import type { ComisionEstado } from "@/lib/generated/prisma/client";
import { db } from "@/lib/db";
import {
  calcularComisionAgente,
  type GrupoAgente,
  type TramoAgente,
} from "./calcularComisionAgente";
import { rangoDelPeriodo } from "./periodo";

/**
 * Capa de datos de la comision del agente: arma la entrada del motor desde la
 * base y persiste el resultado. El calculo vive en `calcularComisionAgente`,
 * que es puro a proposito.
 *
 * La unidad es LA ZONA, no el vendedor: Balta quiere el numero de Salta y el de
 * Tucuman, sin repartir la produccion entre el y Pedro (definido el
 * 27/08/2026). Por eso `ComisionAgentePeriodo` tiene `zonaId` y no `agenteId`.
 *
 * QUE CUOTA ENTRA EN QUE PERIODO: lo mismo que en la liquidacion del vendedor,
 * `detectadaPagaAt`. Con una consecuencia mas grave aca: la primera importacion
 * de la zona sella como recien detectadas TODAS las cuotas historicas, y como
 * el agente no tiene tope de cuota, ese periodo se lleva las 300 cuotas de cada
 * titulo. Por eso se marca con `esLineaBase` y la pantalla lo avisa.
 */

export type RenglonAgente = Omit<GrupoAgente, "cuotaIds">;

export type LiquidacionAgente = {
  periodo: string;
  estado: ComisionEstado;
  fechaCierre: Date | null;
  /** true si la escala del contrato todavia no tiene ningun tramo cargado. */
  sinEscala: boolean;
  /** true si el periodo incluye la primera importacion de la zona. */
  esLineaBase: boolean;
  renglones: RenglonAgente[];
  cuotasCobradas: number;
  baseCobrada: number;
  cuotasSinTramo: number;
  baseSinTramo: number;
  totalComision: number;
  /** Aparte de la comision: no se suma al total, va en el balance del mes. */
  gastosRepresentacion: number;
  ventasNuevas: number;
  renovaciones: number;
  contratos: number;
  objetivoContratos: number;
  cumpleObjetivo: boolean;
  advertencias: string[];
};

// ---------------------------------------------------------------------------
// Lectura
// ---------------------------------------------------------------------------

/** Los tramos del contrato de agencia de una zona, del mas bajo al mas alto. */
export async function listarEscalaAgente(zonaId: number): Promise<TramoAgente[]> {
  const filas = await db.escalaAgente.findMany({
    where: { zonaId },
    orderBy: { cuotaDesde: "asc" },
  });

  return filas.map((fila) => ({
    cuotaDesde: fila.cuotaDesde,
    cuotaHasta: fila.cuotaHasta,
    porcentaje: Number(fila.porcentaje),
  }));
}

/**
 * Todas las cuotas que el padron mostro cobradas en el periodo, sin filtrar por
 * vendedor: al agente le pagan por lo que cobra la agencia entera, incluidas
 * las cuotas de titulos cuyo `NomVen` no se pudo mapear a un vendedor.
 */
async function cuotasDeLaZona(zonaId: number, periodo: string) {
  const { desde, hasta } = rangoDelPeriodo(periodo);

  const cuotas = await db.tituloCuota.findMany({
    where: { detectadaPagaAt: { gte: desde, lt: hasta }, titulo: { zonaId } },
    select: { id: true, numeroCuota: true, importe: true },
  });

  return cuotas.map((cuota) => ({
    id: cuota.id,
    numeroCuota: cuota.numeroCuota,
    importe: Number(cuota.importe),
  }));
}

/**
 * Los contratos del mes: titulos que entraron con origen VENTA_NUEVA o
 * RENOVACION. Los dos cuentan para el objetivo del contrato de agencia (Balta,
 * 27/08/2026), a diferencia del tramo del vendedor, donde la renovacion no
 * suma.
 *
 * El corte es `Titulo.createdAt` —cuando el sistema vio el titulo por primera
 * vez—, igual que `detectadaPagaAt` para las cuotas. Los `BASE` quedan afuera:
 * son los que ya venian de antes del sistema.
 */
async function contratosDelPeriodo(zonaId: number, periodo: string) {
  const { desde, hasta } = rangoDelPeriodo(periodo);

  const filas = await db.titulo.groupBy({
    by: ["origen"],
    where: {
      zonaId,
      createdAt: { gte: desde, lt: hasta },
      origen: { in: ["VENTA_NUEVA", "RENOVACION"] },
    },
    _count: { _all: true },
  });

  const contar = (origen: string) =>
    filas.find((fila) => fila.origen === origen)?._count._all ?? 0;

  return { ventasNuevas: contar("VENTA_NUEVA"), renovaciones: contar("RENOVACION") };
}

/** true si en el periodo cayo la primera importacion de la zona. */
async function incluyeLineaBase(zonaId: number, periodo: string): Promise<boolean> {
  const { desde, hasta } = rangoDelPeriodo(periodo);

  const base = await db.padronImport.findFirst({
    where: { zonaId, esLineaBase: true, createdAt: { gte: desde, lt: hasta } },
    select: { id: true },
  });

  return base !== null;
}

/**
 * Cuanto se cobro de cada numero de cuota en el periodo. Es la auditoria del
 * renglon: un tramo del contrato junta decenas de numeros de cuota distintos y
 * asi se puede ver de donde sale la base. Se agrega en la base de datos para no
 * traer miles de filas a la pantalla.
 */
export async function cuotasPorNumero(zonaId: number, periodo: string) {
  const { desde, hasta } = rangoDelPeriodo(periodo);

  const filas = await db.tituloCuota.groupBy({
    by: ["numeroCuota"],
    where: { detectadaPagaAt: { gte: desde, lt: hasta }, titulo: { zonaId } },
    _count: { _all: true },
    _sum: { importe: true },
    orderBy: { numeroCuota: "asc" },
  });

  return filas.map((fila) => ({
    numeroCuota: fila.numeroCuota,
    cantidad: fila._count._all,
    base: Number(fila._sum.importe ?? 0),
  }));
}

/**
 * La liquidacion del agente para el periodo.
 *
 * En borrador se recalcula en vivo contra el padron; una vez cerrado se muestra
 * lo persistido, con los porcentajes congelados.
 */
export async function obtenerLiquidacionAgente({
  zonaId,
  periodo,
}: {
  zonaId: number;
  periodo: string;
}): Promise<LiquidacionAgente> {
  const [guardado, zona, esLineaBase] = await Promise.all([
    db.comisionAgentePeriodo.findUnique({
      where: { zonaId_periodo: { zonaId, periodo } },
      include: { detalles: { orderBy: { cuotaDesde: "asc" } } },
    }),
    db.zona.findUniqueOrThrow({
      where: { id: zonaId },
      select: { objetivoContratosMensual: true },
    }),
    incluyeLineaBase(zonaId, periodo),
  ]);

  const gastosRepresentacion = Number(guardado?.gastosRepresentacion ?? 0);

  if (guardado?.estado === "CERRADO") {
    const contratos = guardado.ventasNuevas + guardado.renovaciones;
    return {
      periodo,
      estado: "CERRADO",
      fechaCierre: guardado.fechaCierre,
      sinEscala: false,
      esLineaBase,
      renglones: guardado.detalles.map((detalle) => ({
        cuotaDesde: detalle.cuotaDesde,
        cuotaHasta: detalle.cuotaHasta,
        cantidadCuotas: detalle.cantidadCuotas,
        baseCalculo: Number(detalle.baseCalculo),
        porcentajeAplicado: Number(detalle.porcentajeAplicado),
        monto: Number(detalle.monto),
      })),
      cuotasCobradas: guardado.cuotasCobradas,
      baseCobrada: Number(guardado.baseCobrada),
      cuotasSinTramo: 0,
      baseSinTramo: 0,
      totalComision: Number(guardado.totalComision),
      gastosRepresentacion,
      ventasNuevas: guardado.ventasNuevas,
      renovaciones: guardado.renovaciones,
      contratos,
      objetivoContratos: guardado.objetivoContratos,
      cumpleObjetivo: guardado.objetivoContratos === 0 || contratos >= guardado.objetivoContratos,
      advertencias: [],
    };
  }

  const [tramos, cuotas, contratos] = await Promise.all([
    listarEscalaAgente(zonaId),
    cuotasDeLaZona(zonaId, periodo),
    contratosDelPeriodo(zonaId, periodo),
  ]);

  const resultado = calcularComisionAgente({
    cuotas,
    tramos,
    ventasNuevas: contratos.ventasNuevas,
    renovaciones: contratos.renovaciones,
    objetivoContratos: zona.objetivoContratosMensual,
  });

  return {
    periodo,
    estado: guardado?.estado ?? "BORRADOR",
    fechaCierre: guardado?.fechaCierre ?? null,
    sinEscala: tramos.length === 0,
    esLineaBase,
    // Los ids de las cuotas no viajan a la pantalla: el renglon se muestra
    // agrupado y la auditoria sale de `cuotasPorNumero`.
    renglones: resultado.grupos.map((grupo) => ({
      cuotaDesde: grupo.cuotaDesde,
      cuotaHasta: grupo.cuotaHasta,
      cantidadCuotas: grupo.cantidadCuotas,
      baseCalculo: grupo.baseCalculo,
      porcentajeAplicado: grupo.porcentajeAplicado,
      monto: grupo.monto,
    })),
    cuotasCobradas: resultado.cuotasCobradas,
    baseCobrada: resultado.baseCobrada,
    cuotasSinTramo: resultado.cuotasSinTramo,
    baseSinTramo: resultado.baseSinTramo,
    totalComision: resultado.totalComision,
    gastosRepresentacion,
    ventasNuevas: resultado.ventasNuevas,
    renovaciones: resultado.renovaciones,
    contratos: resultado.contratos,
    objetivoContratos: resultado.objetivoContratos,
    cumpleObjetivo: resultado.cumpleObjetivo,
    advertencias: resultado.advertencias,
  };
}

// ---------------------------------------------------------------------------
// Escritura
// ---------------------------------------------------------------------------

/**
 * Cierra el periodo del agente: congela los porcentajes en
 * `ComisionAgenteDetalle` y deja el registro en CERRADO. Tambien congela el
 * objetivo de contratos, que se puede editar despues.
 */
export async function cerrarPeriodoAgente({
  zonaId,
  periodo,
}: {
  zonaId: number;
  periodo: string;
}): Promise<{ total: number }> {
  const liquidacion = await obtenerLiquidacionAgente({ zonaId, periodo });
  const ahora = new Date();

  const datos = {
    ventasNuevas: liquidacion.ventasNuevas,
    renovaciones: liquidacion.renovaciones,
    objetivoContratos: liquidacion.objetivoContratos,
    cuotasCobradas: liquidacion.cuotasCobradas,
    baseCobrada: liquidacion.baseCobrada,
    totalComision: liquidacion.totalComision,
    estado: "CERRADO" as const,
    fechaCierre: ahora,
  };

  await db.$transaction(async (tx) => {
    const registro = await tx.comisionAgentePeriodo.upsert({
      where: { zonaId_periodo: { zonaId, periodo } },
      update: datos,
      create: { zonaId, periodo, ...datos },
      select: { id: true },
    });

    // El detalle se reescribe entero: el cierre es la foto definitiva.
    await tx.comisionAgenteDetalle.deleteMany({ where: { periodoId: registro.id } });

    if (liquidacion.renglones.length > 0) {
      await tx.comisionAgenteDetalle.createMany({
        data: liquidacion.renglones.map((renglon) => ({
          periodoId: registro.id,
          cuotaDesde: renglon.cuotaDesde,
          cuotaHasta: renglon.cuotaHasta,
          cantidadCuotas: renglon.cantidadCuotas,
          baseCalculo: renglon.baseCalculo,
          porcentajeAplicado: renglon.porcentajeAplicado,
          monto: renglon.monto,
        })),
      });
    }
  });

  return { total: liquidacion.totalComision };
}

/** Vuelve el periodo a borrador para poder recalcularlo. */
export async function reabrirPeriodoAgente({
  zonaId,
  periodo,
}: {
  zonaId: number;
  periodo: string;
}) {
  await db.comisionAgentePeriodo.updateMany({
    where: { zonaId, periodo, estado: "CERRADO" },
    data: { estado: "BORRADOR", fechaCierre: null },
  });
}
