"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { periodoActual } from "@/lib/comisiones/periodo";
import { recalcularCaidas } from "@/lib/padron/recalcularCaidas";
import { requireAdmin, requireZonaActivaId } from "@/lib/sesion";

/**
 * Herramientas de desarrollo. Borran datos de verdad y no tienen vuelta atras,
 * asi que no existen fuera de desarrollo.
 *
 * El chequeo esta en la accion y no solo en la pagina a proposito: una server
 * action es un endpoint que se puede invocar sin pasar por la pantalla. Si el
 * corte viviera nada mas en el componente, la accion seguiria ahi.
 */
function soloEnDesarrollo() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Las herramientas de laboratorio no existen en producción.");
  }
}

export type ResultadoVaciado = {
  ok?: boolean;
  error?: string;
  /** Detalle para mostrar al lado del boton cuando el numero importa. */
  mensaje?: string;
  borrados?: {
    cuotas: number;
    titulos: number;
    clientes: number;
    importaciones: number;
  };
};

/**
 * Vacia los datos que entran por el padron en la zona activa: clientes,
 * titulos, cuotas e importaciones.
 *
 * No toca vendedores, alias, escalas, usuarios, leads ni ventas. Recrear el
 * equipo y la escala en cada prueba seria un trabajo inutil, y los alias son
 * justamente lo que hace falta para volver a importar.
 */
export async function vaciarPadron(
  _previo: ResultadoVaciado,
  formData: FormData
): Promise<ResultadoVaciado> {
  soloEnDesarrollo();
  await requireAdmin();
  const zonaId = await requireZonaActivaId();

  // Se escribe el nombre de la zona para confirmar: es la misma idea que pedir
  // el nombre del repo antes de borrarlo. Evita el clic distraido.
  const confirmacion = String(formData.get("confirmacion") ?? "").trim();
  const zona = await db.zona.findUniqueOrThrow({
    where: { id: zonaId },
    select: { nombre: true },
  });

  if (confirmacion.toUpperCase() !== zona.nombre) {
    return { error: `Para confirmar hay que escribir ${zona.nombre}.` };
  }

  const titulos = await db.titulo.findMany({ where: { zonaId }, select: { id: true } });
  const ids = titulos.map((t) => t.id);

  // En orden de dependencia. Las cuotas se borran solas por el cascade de
  // Titulo, pero se hace explicito para poder contarlas.
  const { count: cuotas } = await db.tituloCuota.deleteMany({
    where: { tituloId: { in: ids } },
  });
  const { count: titulosBorrados } = await db.titulo.deleteMany({ where: { zonaId } });
  const { count: clientes } = await db.cliente.deleteMany({ where: { zonaId } });
  const { count: importaciones } = await db.padronImport.deleteMany({ where: { zonaId } });

  revalidatePath("/admin/laboratorio");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/clientes");
  revalidatePath("/admin/padron");
  revalidatePath("/admin/comisiones");

  return {
    ok: true,
    borrados: { cuotas, titulos: titulosBorrados, clientes, importaciones },
  };
}

/**
 * Deja creados los dos vendedores de los padrones de prueba, con sus alias ya
 * vinculados. Sin los alias la importacion se planta: no se importa un padron
 * con nombres de vendedor sin mapear, porque imputarle cuotas al vendedor
 * equivocado corrompe la comision.
 */
export async function crearVendedoresDePrueba(): Promise<ResultadoVaciado> {
  soloEnDesarrollo();
  await requireAdmin();
  const zonaId = await requireZonaActivaId();

  const definiciones = [
    { nomVen: "PRUEBA VENDEDOR UNO", codigo: "PRUEBA-UNO", dni: "99990101", tope: 4 },
    { nomVen: "PRUEBA VENDEDOR DOS", codigo: "PRUEBA-DOS", dni: "99990102", tope: 5 },
  ];

  for (const d of definiciones) {
    const vendedor = await db.vendedor.upsert({
      where: { zonaId_codigo: { zonaId, codigo: d.codigo } },
      update: { activo: true, topeCuotasComision: d.tope },
      create: {
        nombreCompleto: d.nomVen,
        dni: d.dni,
        codigo: d.codigo,
        zonaId,
        topeCuotasComision: d.tope,
      },
      select: { id: true },
    });

    await db.vendedorAlias.upsert({
      where: { zonaId_nomVenPadron: { zonaId, nomVenPadron: d.nomVen } },
      update: { vendedorId: vendedor.id },
      create: { nomVenPadron: d.nomVen, vendedorId: vendedor.id, zonaId },
    });
  }

  revalidatePath("/admin/laboratorio");
  revalidatePath("/admin/vendedores");
  return { ok: true };
}

/**
 * Carga una escala completa de c1 a c5 para poder ver comisiones distintas de
 * cero. Sin esto, las cuotas sin porcentaje liquidan en cero y la pantalla de
 * comisiones no dice nada util.
 *
 * Reemplaza los tramos de la escala predeterminada (la crea si todavia no
 * existe ninguna): si Balta tenia algo cargado ahi a mano, se pierde. Por eso
 * vive aca y no en la pantalla de escalas. Las demas escalas no se tocan.
 */
export async function cargarEscalaDeEjemplo(): Promise<ResultadoVaciado> {
  soloEnDesarrollo();
  await requireAdmin();

  // Dos tramos, para que se note el salto al vender mas. El que arranca en 0
  // tiene que existir siempre: es el que cobra el vendedor que no vendio nada
  // ese mes pero si cobro cuotas viejas.
  const TRAMOS = [
    { ventasMin: 0, ventasMax: 2, porcentajes: [20, 15, 10, 5, 2] },
    { ventasMin: 3, ventasMax: null, porcentajes: [25, 20, 15, 10, 5] },
  ];

  await db.$transaction(async (tx) => {
    const predeterminada =
      (await tx.escala.findFirst({ where: { esPredeterminada: true }, select: { id: true } })) ??
      (await tx.escala.create({
        data: { nombre: "General", esPredeterminada: true },
        select: { id: true },
      }));

    await tx.escalaComision.deleteMany({ where: { escalaId: predeterminada.id } });
    for (const tramo of TRAMOS) {
      for (const [indice, porcentaje] of tramo.porcentajes.entries()) {
        await tx.escalaComision.create({
          data: {
            escalaId: predeterminada.id,
            ventasMin: tramo.ventasMin,
            ventasMax: tramo.ventasMax,
            numeroCuota: indice + 1,
            porcentaje,
          },
        });
      }
    }
  });

  revalidatePath("/admin/laboratorio");
  revalidatePath("/admin/comisiones");
  revalidatePath("/admin/comisiones/escalas");
  return { ok: true };
}

/**
 * Deja la escala del contrato de agencia de la zona activa como la sembro la
 * migracion (adenda del 13/01/2023). Sirve para volver al contrato real despues
 * de haber estado probando porcentajes.
 *
 * Reemplaza los tramos de esta zona; la otra no se toca.
 */
export async function restaurarContratoAgencia(): Promise<ResultadoVaciado> {
  soloEnDesarrollo();
  await requireAdmin();
  const zonaId = await requireZonaActivaId();

  const TRAMOS = [
    { cuotaDesde: 1, cuotaHasta: 2, porcentaje: 25 },
    { cuotaDesde: 3, cuotaHasta: 4, porcentaje: 20 },
    { cuotaDesde: 5, cuotaHasta: 5, porcentaje: 10 },
    { cuotaDesde: 6, cuotaHasta: 60, porcentaje: 4 },
    { cuotaDesde: 61, cuotaHasta: null, porcentaje: 2 },
  ];

  await db.$transaction(async (tx) => {
    await tx.escalaAgente.deleteMany({ where: { zonaId } });
    await tx.escalaAgente.createMany({
      data: TRAMOS.map((tramo) => ({ zonaId, ...tramo })),
    });
  });

  revalidatePath("/admin/laboratorio");
  revalidatePath("/admin/comisiones/agente");
  revalidatePath("/admin/comisiones/agente/escala");
  return { ok: true };
}

/**
 * Vuelve a calcular el estado de caida de todos los titulos de la zona activa.
 *
 * La importacion ya lo deja al dia, pero solo para los titulos que trae ese
 * archivo. Este boton es el equivalente de `scripts/recalcular-caidas.ts` sin
 * consola: sirve para la primera pasada sobre datos que ya estaban cargados y
 * para rehacer el calculo despues de tocar la regla.
 */
export async function recalcularCaidasDeLaZona(): Promise<ResultadoVaciado> {
  soloEnDesarrollo();
  await requireAdmin();
  const zonaId = await requireZonaActivaId();

  const titulos = await db.titulo.findMany({ where: { zonaId }, select: { id: true } });
  const resumen = await recalcularCaidas(db, titulos.map((titulo) => titulo.id));

  revalidatePath("/admin/laboratorio");
  revalidatePath("/admin/clientes");

  return {
    ok: true,
    mensaje:
      `${resumen.titulosRevisados} títulos revisados: ${resumen.caidos} caídos, ` +
      `${resumen.sinDatos} sin datos suficientes.`,
  };
}

/**
 * Cierra unos meses de comision del agente con importes de ejemplo, para poder
 * ver la torta del dashboard con datos.
 *
 * Hace falta un boton porque estos periodos no se pueden fabricar de otra
 * manera: un mes cerrado es el resultado de haber liquidado ese mes, y en la
 * base de desarrollo recien se importaron todos los padrones el mismo dia.
 *
 * Los importes estan elegidos para poder auditarlos de memoria: suman
 * $3.000.000 y las partes son 10, 15, 20, 25 y 30 %. El mes en curso NO se
 * toca, asi se ve que la torta solo cuenta los meses cerrados.
 */
export async function cerrarMesesDeEjemplo(): Promise<ResultadoVaciado> {
  soloEnDesarrollo();
  await requireAdmin();
  const zonaId = await requireZonaActivaId();

  const MESES = [
    { periodo: "2026-03", total: 300_000 },
    { periodo: "2026-04", total: 450_000 },
    { periodo: "2026-05", total: 600_000 },
    { periodo: "2026-06", total: 750_000 },
    { periodo: "2026-07", total: 900_000 },
  ];

  const actual = periodoActual();
  const aCerrar = MESES.filter((mes) => mes.periodo !== actual);

  for (const mes of aCerrar) {
    await db.comisionAgentePeriodo.upsert({
      where: { zonaId_periodo: { zonaId, periodo: mes.periodo } },
      update: { totalComision: mes.total, estado: "CERRADO", fechaCierre: new Date() },
      create: {
        zonaId,
        periodo: mes.periodo,
        totalComision: mes.total,
        estado: "CERRADO",
        fechaCierre: new Date(),
      },
    });
  }

  revalidatePath("/admin/laboratorio");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/comisiones/agente");

  const suma = aCerrar.reduce((total, mes) => total + mes.total, 0);
  return {
    ok: true,
    mensaje: `${aCerrar.length} meses cerrados, $${suma.toLocaleString("es-AR")} en total.`,
  };
}
