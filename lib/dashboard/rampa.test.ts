import { describe, expect, it } from "vitest";
import { pasoDeRampa, PASOS_DE_RAMPA } from "./rampa";

const ULTIMO = PASOS_DE_RAMPA - 1;

describe("pasoDeRampa", () => {
  it("el mes mas nuevo siempre se queda con el paso mas marcado", () => {
    // Es lo que hace que el color signifique algo: si el ultimo mes cambiara de
    // tono segun cuantos meses haya, la torta se leeria distinto cada vez.
    for (let cantidad = 1; cantidad <= PASOS_DE_RAMPA; cantidad++) {
      expect(pasoDeRampa(cantidad - 1, cantidad)).toBe(ULTIMO);
    }
  });

  it("con un solo mes usa el paso mas marcado", () => {
    expect(pasoDeRampa(0, 1)).toBe(ULTIMO);
  });

  it("con dos meses toma los extremos, que es la mayor separacion posible", () => {
    expect(pasoDeRampa(0, 2)).toBe(0);
    expect(pasoDeRampa(1, 2)).toBe(ULTIMO);
  });

  it("con la serie completa usa todos los pasos, uno por mes", () => {
    const pasos = Array.from({ length: PASOS_DE_RAMPA }, (_, i) =>
      pasoDeRampa(i, PASOS_DE_RAMPA)
    );
    expect(pasos).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("nunca se sale de la rampa ni repite hacia atras", () => {
    for (let cantidad = 1; cantidad <= PASOS_DE_RAMPA; cantidad++) {
      let previo = -1;
      for (let i = 0; i < cantidad; i++) {
        const paso = pasoDeRampa(i, cantidad);
        expect(paso).toBeGreaterThanOrEqual(0);
        expect(paso).toBeLessThan(PASOS_DE_RAMPA);
        expect(paso).toBeGreaterThan(previo);
        previo = paso;
      }
    }
  });
});
