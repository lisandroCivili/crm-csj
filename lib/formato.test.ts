import { describe, expect, it } from "vitest";
import { dia, diaDelPadron, momento, pesos, porcentaje } from "./formato";

describe("pesos", () => {
  it("sin decimales cuando el importe es redondo", () => {
    expect(pesos(105_000)).toBe("$ 105.000");
  });

  it("con centavos cuando los tiene", () => {
    expect(pesos(50_000.25)).toBe("$ 50.000,25");
  });
});

describe("porcentaje", () => {
  it("lleva el signo separado", () => {
    expect(porcentaje(20)).toBe("20 %");
  });
});

describe("fechas", () => {
  // 6 de septiembre de 2026, 21:24 en Salta = 7 de septiembre 00:24 UTC.
  const nocheDelSeis = new Date("2026-09-07T00:24:00.000Z");

  it("una venta cargada de noche es del dia que fue acá, no del siguiente", () => {
    expect(dia(nocheDelSeis)).toBe("6/9/2026");
    // El separador entre la hora y "p. m." cambia con la version de ICU, asi
    // que se compara con los espacios normalizados.
    expect(momento(nocheDelSeis).replace(/\s/g, " ")).toBe("6/9/26, 9:24 p. m.");
  });

  it("el dia del padron se lee tal como vino: no se corre por la hora", () => {
    // El padron trae dias sin hora y se guardan a medianoche UTC.
    expect(diaDelPadron(new Date("2026-09-01T00:00:00.000Z"))).toBe("1/9/2026");
  });

  it("mostrar un dia del padron en hora de acá lo correria un dia para atras", () => {
    const primeroDeSeptiembre = new Date("2026-09-01T00:00:00.000Z");
    expect(dia(primeroDeSeptiembre)).toBe("31/8/2026");
    expect(diaDelPadron(primeroDeSeptiembre)).toBe("1/9/2026");
  });
});
