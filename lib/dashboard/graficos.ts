import { db } from "@/lib/db";

/**
 * LAS DOS SERIES QUE MIRA EL DASHBOARD
 *
 * Las dos salen de tablas que ya se llenaban solas, no de calculos nuevos: los
 * periodos cerrados de comision del agente (Fase 3) y las cifras que cada
 * importacion deja en `PadronImport` (Fase 2). Por eso viven aca y no en
 * `lib/comisiones/`: son consultas de presentacion, no reglas de negocio.
 */

/** Cuantos meses entran en la torta. Mas de 6 gajos dejan de leerse. */
export const MESES_EN_LA_TORTA = 6;
/** Cuantos padrones entran en las barras. */
export const PADRONES_EN_LAS_BARRAS = 5;

export type MesComision = {
  periodo: string;
  total: number;
};

/**
 * Los ultimos meses **cerrados** de comision del agente, del mas viejo al mas
 * nuevo.
 *
 * Solo los cerrados: un mes en borrador se sigue moviendo con cada padron que
 * entra, asi que meterlo en la torta lo mostraria mas chico de lo que va a
 * terminar siendo. La pantalla lo aclara en vez de disimularlo.
 */
export async function comisionesCerradas(
  zonaId: number,
  cantidad: number = MESES_EN_LA_TORTA
): Promise<MesComision[]> {
  const periodos = await db.comisionAgentePeriodo.findMany({
    where: { zonaId, estado: "CERRADO" },
    orderBy: { periodo: "desc" },
    take: cantidad,
    select: { periodo: true, totalComision: true },
  });

  return periodos
    .map((fila) => ({ periodo: fila.periodo, total: Number(fila.totalComision) }))
    .reverse();
}

export type ProduccionPadron = {
  id: string;
  archivoNombre: string;
  /** Mes del padron, o la fecha de importacion si el archivo no lo traia. */
  fecha: Date;
  ventasNuevas: number;
  renovaciones: number;
  /** Titulos nuevos en total. En una linea base es lo unico que se sabe. */
  titulosNuevos: number;
  /** Primera importacion de la zona: no hay con que comparar. */
  esLineaBase: boolean;
};

/**
 * Los ultimos padrones importados, del mas viejo al mas nuevo.
 *
 * Ojo con la linea base: ahi `titulosNuevosVenta` y `titulosNuevosRenovacion`
 * son 0 no porque no haya habido produccion, sino porque no habia padron
 * anterior contra el cual comparar. Dibujar esa barra en cero seria decir que
 * ese mes no se vendio nada, y el grafico tiene que distinguir las dos cosas.
 */
export async function produccionPorPadron(
  zonaId: number,
  cantidad: number = PADRONES_EN_LAS_BARRAS
): Promise<ProduccionPadron[]> {
  const padrones = await db.padronImport.findMany({
    where: { zonaId },
    orderBy: { createdAt: "desc" },
    take: cantidad,
    select: {
      id: true,
      archivoNombre: true,
      periodoHasta: true,
      createdAt: true,
      titulosNuevosVenta: true,
      titulosNuevosRenovacion: true,
      titulosNuevos: true,
      esLineaBase: true,
    },
  });

  return padrones
    .map((padron) => ({
      id: padron.id,
      archivoNombre: padron.archivoNombre,
      fecha: padron.periodoHasta ?? padron.createdAt,
      ventasNuevas: padron.titulosNuevosVenta,
      renovaciones: padron.titulosNuevosRenovacion,
      titulosNuevos: padron.titulosNuevos,
      esLineaBase: padron.esLineaBase,
    }))
    .reverse();
}
