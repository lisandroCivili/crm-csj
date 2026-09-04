import { describe, expect, it } from "vitest";
import { aNumeroLocal } from "./numero";

describe("aNumeroLocal", () => {
  it("el punto de miles sin decimales no divide el número por mil", () => {
    // El caso que apareció en la Fase 14: `Number("250.000")` da 250, así que un
    // plan de $250.000 se importaba como uno de $250.
    expect(aNumeroLocal("250.000")).toBe(250000);
    expect(aNumeroLocal("$ 250.000")).toBe(250000);
    expect(aNumeroLocal("1.234.567")).toBe(1234567);
  });

  it("con coma decimal, los puntos son miles", () => {
    expect(aNumeroLocal("1.234.567,89")).toBe(1234567.89);
    expect(aNumeroLocal("1.234,5")).toBe(1234.5);
    expect(aNumeroLocal("0,5")).toBe(0.5);
  });

  it("con punto decimal y una o dos cifras, el punto es decimal", () => {
    expect(aNumeroLocal("1234.56")).toBe(1234.56);
    expect(aNumeroLocal("1234.5")).toBe(1234.5);
  });

  it("un número entero se lee tal cual", () => {
    expect(aNumeroLocal("250000")).toBe(250000);
    expect(aNumeroLocal(250000)).toBe(250000);
  });

  it("descarta el símbolo de moneda, los espacios y el texto pegado", () => {
    expect(aNumeroLocal("  $ 100.000  ")).toBe(100000);
    expect(aNumeroLocal("100000 ARS")).toBe(100000);
  });

  it("conserva el signo", () => {
    expect(aNumeroLocal("-1.500")).toBe(-1500);
    expect(aNumeroLocal("-1234.56")).toBe(-1234.56);
  });

  it("lo que no es un número da null, no NaN ni cero", () => {
    // Cero sería una respuesta: diría que el importe es cero. Null dice que no
    // se pudo leer, que es otra cosa.
    expect(aNumeroLocal(null)).toBeNull();
    expect(aNumeroLocal(undefined)).toBeNull();
    expect(aNumeroLocal("")).toBeNull();
    expect(aNumeroLocal("   ")).toBeNull();
    expect(aNumeroLocal("sin datos")).toBeNull();
    expect(aNumeroLocal("-")).toBeNull();
    expect(aNumeroLocal(Number.NaN)).toBeNull();
    expect(aNumeroLocal(Number.POSITIVE_INFINITY)).toBeNull();
  });

  it("el cero es un número, no un vacío", () => {
    expect(aNumeroLocal(0)).toBe(0);
    expect(aNumeroLocal("0")).toBe(0);
  });
});
