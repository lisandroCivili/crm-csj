import { describe, expect, it } from "vitest";
import { itemsVisibles, NAVEGACION } from "./navegacion";
import type { Permisos } from "./sesion";

const TODO: Permisos = { verLeads: true, cargarVentas: true, verComision: true };
const NADA: Permisos = { verLeads: false, cargarVentas: false, verComision: false };

const hrefs = (role: "ADMIN" | "VENDEDOR", permisos: Permisos) =>
  itemsVisibles(role, permisos).map((item) => item.href);

describe("itemsVisibles", () => {
  it("el menu del admin no depende de los permisos", () => {
    expect(hrefs("ADMIN", TODO)).toEqual(NAVEGACION.ADMIN.map((item) => item.href));
    expect(hrefs("ADMIN", NADA)).toEqual(NAVEGACION.ADMIN.map((item) => item.href));
  });

  it("con todos los permisos el vendedor ve todo su menu", () => {
    expect(hrefs("VENDEDOR", TODO)).toEqual([
      "/vendedor/dashboard",
      "/vendedor/leads",
      "/vendedor/ventas",
    ]);
  });

  it("sin verLeads desaparece la seccion de leads", () => {
    expect(hrefs("VENDEDOR", { ...TODO, verLeads: false })).toEqual([
      "/vendedor/dashboard",
      "/vendedor/ventas",
    ]);
  });

  it("sin cargarVentas desaparece la seccion de ventas", () => {
    expect(hrefs("VENDEDOR", { ...TODO, cargarVentas: false })).toEqual([
      "/vendedor/dashboard",
      "/vendedor/leads",
    ]);
  });

  it("verComision no saca ninguna seccion: no hay pantalla propia de comisiones", () => {
    expect(hrefs("VENDEDOR", { ...TODO, verComision: false })).toEqual(hrefs("VENDEDOR", TODO));
  });

  it("sin ningun permiso le queda el dashboard, para no dejarlo sin donde caer", () => {
    expect(hrefs("VENDEDOR", NADA)).toEqual(["/vendedor/dashboard"]);
  });

  it("no rompe el orden ni duplica items", () => {
    const items = itemsVisibles("VENDEDOR", TODO);
    expect(new Set(items.map((item) => item.href)).size).toBe(items.length);
  });
});
