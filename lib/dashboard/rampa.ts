/**
 * La rampa ordinal de la torta de comisiones.
 *
 * Vive en su propio archivo, sin tocar la base, por dos razones: es la unica
 * logica del grafico que se puede equivocar en silencio, y asi se puede testear
 * sin levantar Postgres.
 *
 * Es una rampa de un solo tono y no una lista de colores distintos porque los
 * meses tienen orden, y el color tiene que mostrarlo. Los pasos estan en
 * `globals.css` (`--serie-1` a `--serie-6`) y se validaron contra el chequeo de
 * daltonismo antes de usarlos.
 */

/** Cuantos pasos tiene la rampa. */
export const PASOS_DE_RAMPA = 6;

/**
 * Que paso le toca al mes `indice` de una serie de `cantidad` meses.
 *
 * Reparte los meses sobre la rampa dejando la mayor distancia posible entre
 * pasos: con dos meses toma los extremos, con seis los usa todos. El mes mas
 * nuevo siempre se queda con el ultimo paso, el mas marcado, asi el color dice
 * cual es el mes reciente sin tener que leer la leyenda.
 */
export function pasoDeRampa(indice: number, cantidad: number): number {
  if (cantidad <= 1) return PASOS_DE_RAMPA - 1;
  return Math.round((indice * (PASOS_DE_RAMPA - 1)) / (cantidad - 1));
}
