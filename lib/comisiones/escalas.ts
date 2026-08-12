import type { FilaEscala } from "./calcularComisionPeriodo";
import { CUOTAS_COMISIONABLES } from "./constantes";

/**
 * En la base cada combinacion (ventasMin, numeroCuota) es una fila, pero la
 * escala se lee y se edita por tramo: un piso de ventas nuevas y el porcentaje
 * de cada numero de cuota. Aca se hace esa traduccion, y se revisa que la
 * escala cargada no deje agujeros por donde se cuele una liquidacion en cero.
 */

export type Tramo = {
  ventasMin: number;
  ventasMax: number | null;
  /** Un porcentaje por numero de cuota, en el orden de CUOTAS_COMISIONABLES. */
  porcentajes: (number | null)[];
};

export function agruparEnTramos(filas: FilaEscala[]): Tramo[] {
  const porPiso = new Map<number, Tramo>();

  for (const fila of filas) {
    const tramo = porPiso.get(fila.ventasMin) ?? {
      ventasMin: fila.ventasMin,
      ventasMax: fila.ventasMax,
      porcentajes: CUOTAS_COMISIONABLES.map(() => null),
    };

    const indice = CUOTAS_COMISIONABLES.indexOf(
      fila.numeroCuota as (typeof CUOTAS_COMISIONABLES)[number]
    );
    if (indice >= 0) tramo.porcentajes[indice] = fila.porcentaje;

    porPiso.set(fila.ventasMin, tramo);
  }

  return [...porPiso.values()].sort((a, b) => a.ventasMin - b.ventasMin);
}

/**
 * Problemas que hacen que alguien cobre mal. Se muestran en la pantalla de
 * escalas para que Balta los corrija antes de liquidar.
 */
export function revisarEscala(tramos: Tramo[]): string[] {
  if (tramos.length === 0) return [];

  const avisos: string[] = [];
  const ordenados = [...tramos].sort((a, b) => a.ventasMin - b.ventasMin);

  if (ordenados[0].ventasMin !== 0) {
    avisos.push(
      `El primer tramo arranca en ${ordenados[0].ventasMin} ventas: un vendedor que ` +
        "vendió menos ese mes no cobraría nada, ni siquiera sus cuotas viejas. " +
        "Agregá un tramo que empiece en 0."
    );
  }

  for (let i = 0; i < ordenados.length - 1; i++) {
    const actual = ordenados[i];
    const siguiente = ordenados[i + 1];
    if (actual.ventasMax === null) continue;
    if (siguiente.ventasMin > actual.ventasMax + 1) {
      avisos.push(
        `Queda un hueco entre ${actual.ventasMax} y ${siguiente.ventasMin} ventas: ` +
          "nadie que caiga ahí tiene porcentaje."
      );
    }
  }

  if (ordenados.every((tramo) => tramo.ventasMax !== null)) {
    const ultimo = ordenados[ordenados.length - 1];
    avisos.push(
      `El último tramo corta en ${ultimo.ventasMax} ventas. Dejá su techo vacío para ` +
        "que cubra de ahí en adelante."
    );
  }

  const incompletos = ordenados.filter((tramo) =>
    tramo.porcentajes.some((porcentaje) => porcentaje === null)
  );
  if (incompletos.length > 0) {
    const cuales = incompletos.map((tramo) => `desde ${tramo.ventasMin}`).join(", ");
    avisos.push(
      `Hay tramos con cuotas sin porcentaje (${cuales}). Esas cuotas se liquidan en cero ` +
        "hasta que las cargues."
    );
  }

  return avisos;
}
