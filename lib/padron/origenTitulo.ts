import type { TituloOrigen } from "@/lib/generated/prisma/client";

/**
 * DE DONDE SALE UN TITULO
 *
 * Balta lo definio asi el 24/08/2026: una renovacion es un titulo que **no
 * estaba en el padron anterior** y aparece con cuota mayor a 1. Si aparece con
 * cuota 1, es una venta nueva del mes.
 *
 * La distincion importa por dos motivos:
 *
 * - Para la comision: solo las cuotas 1 suman al volumen que define el tramo de
 *   la escala. La renovacion no trae cuota 1, asi que no lo mueve, pero sus
 *   cuotas se comisionan igual que cualquier otra dentro del tope del vendedor.
 *   Eso ya funcionaba solo; el motor no distingue origenes.
 * - Para medir la produccion del mes sin inflarla con titulos que vienen de
 *   otro lado.
 *
 * Es una funcion pura y aparte para poder testear la regla sin base de datos:
 * es facil de romper sin darse cuenta al tocar la importacion.
 */

/**
 * La cuota mas baja con la que aparece cada titulo en el archivo. El padron
 * trae 3 meses por titulo (cuotas n, n+1, n+2), asi que la primera de las tres
 * es la que dice si el titulo arranca o venia de antes.
 */
export function cuotasInicialesDelArchivo(
  filas: { numTit: string; numeroCuota: number }[]
): Map<string, number> {
  const minimos = new Map<string, number>();
  for (const fila of filas) {
    const previo = minimos.get(fila.numTit);
    if (previo === undefined || fila.numeroCuota < previo) {
      minimos.set(fila.numTit, fila.numeroCuota);
    }
  }
  return minimos;
}

/**
 * Origen de un titulo que el padron trae por primera vez.
 *
 * `esLineaBase` es la primera importacion de la zona: ahi no hay padron
 * anterior contra el cual comparar, asi que **todo** es BASE. Marcar como
 * "venta nueva" un titulo solo porque su cuota mas baja conocida es 1 seria
 * inventar produccion que en realidad puede tener anios.
 */
export function origenDeTituloNuevo({
  cuotaInicial,
  esLineaBase,
}: {
  cuotaInicial: number;
  esLineaBase: boolean;
}): TituloOrigen {
  if (esLineaBase) return "BASE";
  return cuotaInicial === 1 ? "VENTA_NUEVA" : "RENOVACION";
}
