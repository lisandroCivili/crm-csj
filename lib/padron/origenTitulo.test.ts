import { describe, expect, it } from "vitest";
import { cuotasInicialesDelArchivo, origenDeTituloNuevo } from "./origenTitulo";

/** Una fila del padron, con lo unico que mira esta regla. */
function fila(numTit: string, numeroCuota: number) {
  return { numTit, numeroCuota };
}

describe("cuotasInicialesDelArchivo", () => {
  it("se queda con la cuota mas baja de cada titulo", () => {
    // Como llega el padron: 3 meses por titulo, cuotas consecutivas.
    const minimos = cuotasInicialesDelArchivo([
      fila("A-1", 12),
      fila("A-1", 13),
      fila("A-1", 14),
      fila("B-2", 1),
      fila("B-2", 2),
      fila("B-2", 3),
    ]);

    expect(minimos.get("A-1")).toBe(12);
    expect(minimos.get("B-2")).toBe(1);
  });

  it("no depende del orden de las filas", () => {
    const minimos = cuotasInicialesDelArchivo([fila("A-1", 9), fila("A-1", 7), fila("A-1", 8)]);
    expect(minimos.get("A-1")).toBe(7);
  });

  it("un titulo que no esta en el archivo no aparece", () => {
    const minimos = cuotasInicialesDelArchivo([fila("A-1", 1)]);
    expect(minimos.has("B-2")).toBe(false);
  });
});

describe("origenDeTituloNuevo", () => {
  it("cuota 1 es venta nueva", () => {
    expect(origenDeTituloNuevo({ cuotaInicial: 1, esLineaBase: false })).toBe("VENTA_NUEVA");
  });

  it("cuota mayor a 1 es renovacion", () => {
    expect(origenDeTituloNuevo({ cuotaInicial: 2, esLineaBase: false })).toBe("RENOVACION");
    expect(origenDeTituloNuevo({ cuotaInicial: 87, esLineaBase: false })).toBe("RENOVACION");
  });

  it("en la primera importacion de la zona todo es BASE, incluso la cuota 1", () => {
    // Es la diferencia que mas importa: sin padron anterior no se puede saber
    // si un titulo con cuota 1 se vendio este mes o hace tres anios.
    expect(origenDeTituloNuevo({ cuotaInicial: 1, esLineaBase: true })).toBe("BASE");
    expect(origenDeTituloNuevo({ cuotaInicial: 40, esLineaBase: true })).toBe("BASE");
  });
});
