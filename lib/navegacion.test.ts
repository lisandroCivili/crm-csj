import { describe, expect, it } from "vitest";
import { itemsVisibles, NAVEGACION, rutaInterna } from "./navegacion";
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

describe("rutaInterna", () => {
  it("deja pasar una ruta del sistema, con query incluida", () => {
    expect(rutaInterna("/admin/clientes")).toBe("/admin/clientes");
    expect(rutaInterna("/admin/leads?q=ana&pagina=2")).toBe("/admin/leads?q=ana&pagina=2");
  });

  it("rechaza una URL absoluta", () => {
    expect(rutaInterna("https://otro-sitio.com")).toBe("/");
  });

  it("rechaza las dos formas que empiezan con barra y salen del sitio", () => {
    // `//otro.com` es una URL con el protocolo actual, y varios navegadores
    // leen `/\otro.com` igual. Las dos pasan un startsWith("/") a secas.
    expect(rutaInterna("//otro-sitio.com")).toBe("/");
    expect(rutaInterna("/\\otro-sitio.com")).toBe("/");
  });

  it("rechaza lo que no es texto", () => {
    expect(rutaInterna(undefined)).toBe("/");
    expect(rutaInterna(null)).toBe("/");
    expect(rutaInterna(42)).toBe("/");
  });

  it("respeta el destino por defecto que le pasen", () => {
    expect(rutaInterna("http://otro.com", "/admin/dashboard")).toBe("/admin/dashboard");
  });
});
