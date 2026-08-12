import { describe, expect, it } from "vitest";
import {
  esPeriodoValido,
  etiquetaPeriodo,
  periodoAnterior,
  periodoDeFecha,
  rangoDelPeriodo,
  ultimosPeriodos,
} from "./periodo";

describe("rangoDelPeriodo", () => {
  it("arma un rango semiabierto en UTC", () => {
    const { desde, hasta } = rangoDelPeriodo("2026-08");

    expect(desde.toISOString()).toBe("2026-08-01T00:00:00.000Z");
    expect(hasta.toISOString()).toBe("2026-09-01T00:00:00.000Z");
  });

  it("cierra bien diciembre", () => {
    expect(rangoDelPeriodo("2026-12").hasta.toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });

  it("rechaza lo que no sea YYYY-MM", () => {
    expect(() => rangoDelPeriodo("2026-13")).toThrow();
    expect(() => rangoDelPeriodo("agosto")).toThrow();
    expect(esPeriodoValido("2026-00")).toBe(false);
    expect(esPeriodoValido("2026-08")).toBe(true);
  });
});

describe("navegacion entre periodos", () => {
  it("retrocede cruzando el año", () => {
    expect(periodoAnterior("2026-01")).toBe("2025-12");
    expect(periodoAnterior("2026-03", 5)).toBe("2025-10");
  });

  it("lista los ultimos periodos del mas viejo al mas nuevo", () => {
    expect(ultimosPeriodos("2026-02", 4)).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"]);
  });

  it("una fecha cae en el periodo de su mes UTC", () => {
    expect(periodoDeFecha(new Date("2026-08-31T23:59:59.000Z"))).toBe("2026-08");
    expect(periodoDeFecha(new Date("2026-09-01T00:00:00.000Z"))).toBe("2026-09");
  });
});

describe("etiquetaPeriodo", () => {
  it("se lee en castellano", () => {
    expect(etiquetaPeriodo("2026-08")).toContain("agosto");
    expect(etiquetaPeriodo("2026-08")).toContain("2026");
  });
});
