import { describe, expect, it } from "vitest";
import type { FilaEscala } from "./calcularComisionPeriodo";
import { agruparEnTramos, revisarEscala, type Tramo } from "./escalas";

function fila(
  ventasMin: number,
  ventasMax: number | null,
  numeroCuota: number,
  porcentaje: number
): FilaEscala {
  return { ventasMin, ventasMax, numeroCuota, porcentaje };
}

function tramo(ventasMin: number, ventasMax: number | null, porcentajes: (number | null)[]): Tramo {
  return { ventasMin, ventasMax, porcentajes };
}

const COMPLETO = [5, 3, 2, 1, 0.5];

describe("agruparEnTramos", () => {
  it("junta las filas del mismo piso en un tramo, ordenado por cuota", () => {
    const tramos = agruparEnTramos([
      fila(0, 4, 3, 2),
      fila(0, 4, 1, 5),
      fila(5, null, 1, 8),
    ]);

    expect(tramos).toEqual([
      tramo(0, 4, [5, null, 2, null, null]),
      tramo(5, null, [8, null, null, null, null]),
    ]);
  });

  it("devuelve los tramos ordenados por piso", () => {
    const tramos = agruparEnTramos([fila(10, null, 1, 12), fila(0, 9, 1, 5)]);
    expect(tramos.map((t) => t.ventasMin)).toEqual([0, 10]);
  });
});

describe("revisarEscala", () => {
  it("no dice nada de una escala bien armada", () => {
    expect(revisarEscala([tramo(0, 4, COMPLETO), tramo(5, null, COMPLETO)])).toEqual([]);
  });

  it("no se queja cuando todavia no hay nada cargado", () => {
    expect(revisarEscala([])).toEqual([]);
  });

  it("avisa si no hay tramo que arranque en 0", () => {
    const avisos = revisarEscala([tramo(3, null, COMPLETO)]);
    expect(avisos[0]).toContain("no cobraría nada");
  });

  it("detecta huecos entre tramos", () => {
    const avisos = revisarEscala([tramo(0, 4, COMPLETO), tramo(10, null, COMPLETO)]);
    expect(avisos.some((aviso) => aviso.includes("hueco"))).toBe(true);
  });

  it("tramos consecutivos no son un hueco", () => {
    const avisos = revisarEscala([tramo(0, 4, COMPLETO), tramo(5, null, COMPLETO)]);
    expect(avisos.some((aviso) => aviso.includes("hueco"))).toBe(false);
  });

  it("avisa si el ultimo tramo tiene techo", () => {
    const avisos = revisarEscala([tramo(0, 4, COMPLETO), tramo(5, 9, COMPLETO)]);
    expect(avisos.some((aviso) => aviso.includes("de ahí en adelante"))).toBe(true);
  });

  it("avisa si a un tramo le faltan porcentajes", () => {
    const avisos = revisarEscala([tramo(0, null, [5, 3, null, null, null])]);
    expect(avisos.some((aviso) => aviso.includes("sin porcentaje"))).toBe(true);
  });
});
