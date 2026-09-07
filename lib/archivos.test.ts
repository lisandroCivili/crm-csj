import { mkdtemp, readdir, utimes } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `lib/archivos.ts` lee UPLOADS_DIR al importarse, asi que cada test necesita
 * un directorio propio y una importacion fresca.
 */
async function conDirectorio() {
  const raiz = await mkdtemp(path.join(tmpdir(), "crm-archivos-"));
  process.env.UPLOADS_DIR = raiz;
  vi.resetModules();
  const modulo = await import("./archivos");
  return { raiz, tmp: path.join(raiz, "tmp"), ...modulo };
}

const original = process.env.UPLOADS_DIR;
beforeEach(() => vi.resetModules());
afterEach(() => {
  if (original === undefined) delete process.env.UPLOADS_DIR;
  else process.env.UPLOADS_DIR = original;
});

describe("temporales de la importacion", () => {
  it("guarda y vuelve a leer el archivo con su nombre", async () => {
    const { guardarTemporal, leerTemporal } = await conDirectorio();
    const token = await guardarTemporal(Buffer.from("hola"), "padron.xls");
    const leido = await leerTemporal(token);
    expect(leido.contenido.toString()).toBe("hola");
    expect(leido.nombreOriginal).toBe("padron.xls");
  });

  it("el que se abandona en la previsualizacion caduca al dia siguiente", async () => {
    const { guardarTemporal, tmp } = await conDirectorio();

    const abandonado = await guardarTemporal(Buffer.from("padron real"), "viejo.xls");
    // Lo envejece dos dias: es el que nadie confirmo.
    const haceDosDias = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    for (const ext of ["bin", "json"]) {
      const ruta = path.join(tmp, `${abandonado}.${ext}`);
      await utimes(ruta, haceDosDias, haceDosDias);
    }

    const nuevo = await guardarTemporal(Buffer.from("padron de hoy"), "nuevo.xls");
    const quedaron = await readdir(tmp);

    expect(quedaron.some((n) => n.startsWith(abandonado))).toBe(false);
    expect(quedaron.filter((n) => n.startsWith(nuevo))).toHaveLength(2);
  });

  it("no borra el que se subio recien, que es el que se esta por confirmar", async () => {
    const { guardarTemporal, leerTemporal, tmp } = await conDirectorio();
    const primero = await guardarTemporal(Buffer.from("uno"), "uno.xls");
    await guardarTemporal(Buffer.from("dos"), "dos.xls");
    expect((await leerTemporal(primero)).contenido.toString()).toBe("uno");
    expect(await readdir(tmp)).toHaveLength(4);
  });

  it("un directorio que todavia no existe no rompe la limpieza", async () => {
    const raiz = await mkdtemp(path.join(tmpdir(), "crm-archivos-"));
    process.env.UPLOADS_DIR = path.join(raiz, "no-existe");
    vi.resetModules();
    const { guardarTemporal } = await import("./archivos");
    await expect(guardarTemporal(Buffer.from("x"), "x.xls")).resolves.toBeTruthy();
  });

  it("borrarTemporal saca los dos archivos del token", async () => {
    const { guardarTemporal, borrarTemporal, tmp } = await conDirectorio();
    const token = await guardarTemporal(Buffer.from("x"), "x.xls");
    await borrarTemporal(token);
    expect(await readdir(tmp)).toHaveLength(0);
  });

  it("un token manipulado no sale del directorio temporal", async () => {
    const { leerTemporal } = await conDirectorio();
    await expect(leerTemporal("../../../etc/passwd")).rejects.toThrow(/inv[aá]lido/i);
  });
});
