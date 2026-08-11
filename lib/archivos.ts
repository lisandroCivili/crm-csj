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

// ---------------------------------------------------------------------------
// Adjuntos de ventas (foto de DNI y contrato)
//
// Son datos sensibles: nunca se sirven por URL publica. Se guardan fuera de
// /public y salen por /api/uploads/[id], que valida sesion y permiso.
// ---------------------------------------------------------------------------

const ADJUNTOS = path.join(RAIZ, "adjuntos");

export const TIPOS_ADJUNTO_PERMITIDOS = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

export const TAMANIO_MAXIMO_ADJUNTO = 10 * 1024 * 1024;

const EXTENSION_POR_TIPO: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

/**
 * Guarda un adjunto y devuelve su ruta relativa al directorio de uploads.
 * Se guarda relativa y no absoluta para que mover el volumen de lugar no
 * invalide lo que ya esta en la base.
 */
export async function guardarAdjunto(
  contenido: Buffer,
  mimeType: string
): Promise<string> {
  const extension = EXTENSION_POR_TIPO[mimeType];
  if (!extension) throw new Error("Tipo de archivo no permitido.");

  const ahora = new Date();
  const carpeta = path.join(
    String(ahora.getUTCFullYear()),
    String(ahora.getUTCMonth() + 1).padStart(2, "0")
  );

  await asegurarDirectorio(path.join(ADJUNTOS, carpeta));

  const relativa = path.join("adjuntos", carpeta, `${randomUUID()}.${extension}`);
  await writeFile(path.join(RAIZ, relativa), contenido);

  return relativa.split(path.sep).join("/");
}

export async function leerAdjunto(rutaRelativa: string): Promise<Buffer> {
  const destino = path.resolve(RAIZ, rutaRelativa);
  const raizAbsoluta = path.resolve(RAIZ);

  // Aunque la ruta sale de la base y no del usuario, se verifica que no se
  // escape del directorio de uploads: es la ultima linea antes de servir un
  // archivo arbitrario del disco.
  if (destino !== raizAbsoluta && !destino.startsWith(raizAbsoluta + path.sep)) {
    throw new Error("Ruta de archivo inválida.");
  }

  return readFile(destino);
}

export async function borrarAdjunto(rutaRelativa: string): Promise<void> {
  try {
    await unlink(path.resolve(RAIZ, rutaRelativa));
  } catch {
    // Si el archivo ya no esta, el objetivo igual se cumplio.
  }
}
