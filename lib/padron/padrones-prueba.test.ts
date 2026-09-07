import { describe, expect, it } from "vitest";
import {
  padronesDeLaZona,
  sufijoZonaPadronPrueba,
  zonaDelPadronDePrueba,
} from "./padrones-prueba";

const TODOS = [
  "padron-prueba-01-2026-06.xlsx",
  "padron-prueba-07-2026-12.xlsx",
  "padron-prueba-tucuman-01-2026-06.xlsx",
  "padron-prueba-tucuman-07-2026-12.xlsx",
];

describe("sufijoZonaPadronPrueba", () => {
  it("Salta no lleva marca: sus archivos ya existian con ese nombre", () => {
    expect(sufijoZonaPadronPrueba("SALTA")).toBe("");
  });

  it("las demas zonas van en minusculas y con guion", () => {
    expect(sufijoZonaPadronPrueba("TUCUMAN")).toBe("tucuman-");
  });
});

describe("zonaDelPadronDePrueba", () => {
  it("lee la zona del nombre del archivo", () => {
    expect(zonaDelPadronDePrueba("padron-prueba-tucuman-03-2026-08.xlsx")).toBe("TUCUMAN");
  });

  it("sin marca es Salta", () => {
    expect(zonaDelPadronDePrueba("padron-prueba-03-2026-08.xlsx")).toBe("SALTA");
  });

  it("un archivo que no sigue la convencion cuenta como Salta", () => {
    expect(zonaDelPadronDePrueba("otro-archivo.xlsx")).toBe("SALTA");
  });

  it("el nombre generado y el leido son la misma regla", () => {
    for (const zona of ["SALTA", "TUCUMAN"]) {
      const archivo = `padron-prueba-${sufijoZonaPadronPrueba(zona)}01-2026-06.xlsx`;
      expect(zonaDelPadronDePrueba(archivo)).toBe(zona);
    }
  });
});

describe("padronesDeLaZona", () => {
  it("deja fuera los de la otra zona", () => {
    expect(padronesDeLaZona(TODOS, "SALTA")).toEqual([
      "padron-prueba-01-2026-06.xlsx",
      "padron-prueba-07-2026-12.xlsx",
    ]);
    expect(padronesDeLaZona(TODOS, "TUCUMAN")).toEqual([
      "padron-prueba-tucuman-01-2026-06.xlsx",
      "padron-prueba-tucuman-07-2026-12.xlsx",
    ]);
  });

  it("una zona sin padrones generados devuelve la lista vacia, no todos", () => {
    expect(padronesDeLaZona(TODOS, "JUJUY")).toEqual([]);
  });
});
