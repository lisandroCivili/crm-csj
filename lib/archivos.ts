import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const RAIZ = process.env.UPLOADS_DIR ?? "./uploads";
const TEMPORALES = path.join(RAIZ, "tmp");

/**
 * Archivos que viven entre dos pasos de un formulario: se sube el padron, se
 * previsualiza y recien despues se confirma la importacion. Guardarlo en disco
 * evita tener que volver a subir 2 MB en el segundo paso.
 */

async function asegurarDirectorio(directorio: string) {
  await mkdir(directorio, { recursive: true });
}

export async function guardarTemporal(
  contenido: Buffer,
  nombreOriginal: string
): Promise<string> {
  await asegurarDirectorio(TEMPORALES);
  const token = randomUUID();
  await writeFile(path.join(TEMPORALES, `${token}.bin`), contenido);
  await writeFile(
    path.join(TEMPORALES, `${token}.json`),
    JSON.stringify({ nombreOriginal, creado: new Date().toISOString() })
  );
  return token;
}

function rutaDe(token: string, extension: string): string {
  // El token se genera con randomUUID, pero igual se valida el formato para que
  // un valor manipulado no pueda salirse del directorio temporal.
  if (!/^[0-9a-f-]{36}$/i.test(token)) throw new Error("Token de archivo inválido.");
  return path.join(TEMPORALES, `${token}.${extension}`);
}

export async function leerTemporal(
  token: string
): Promise<{ contenido: Buffer; nombreOriginal: string }> {
  const contenido = await readFile(rutaDe(token, "bin"));
  const meta = JSON.parse(await readFile(rutaDe(token, "json"), "utf8"));
  return { contenido, nombreOriginal: String(meta.nombreOriginal ?? "padron.xls") };
}

export async function borrarTemporal(token: string): Promise<void> {
  await Promise.allSettled([
    unlink(rutaDe(token, "bin")),
    unlink(rutaDe(token, "json")),
  ]);
}
