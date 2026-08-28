/**
 * Traduccion de errores de Prisma a errores de formulario.
 *
 * Vive fuera de las acciones porque un archivo `"use server"` solo puede
 * exportar funciones async: estos helpers son sincronos y los comparten varias
 * pantallas.
 */

export type ErroresDeCampo = Record<string, string[] | undefined>;

/** Violacion de indice unico. */
export function esDuplicado(error: unknown): boolean {
  return (error as { code?: string })?.code === "P2002";
}

/**
 * Metadatos de un P2002. `target` es donde Prisma ponia la columna que choco;
 * con un driver adapter (este proyecto usa `@prisma/adapter-pg`) ese campo
 * llega vacio y el detalle viene del driver, adentro de `driverAdapterError`.
 */
type MetaDuplicado = {
  target?: unknown;
  driverAdapterError?: {
    cause?: { constraint?: { fields?: unknown; index?: unknown } };
  };
};

/**
 * Que columna choco, para poder marcar el campo correcto del formulario.
 *
 * Se miran las dos formas a proposito: si alguna vez se saca el adapter, o si
 * una version futura vuelve a completar `target`, el llamador no se entera.
 * Cuando no se puede saber devuelve una lista vacia, que es distinto de
 * `[""]`: eso ultimo hacia que `erroresPorDuplicado` comparara contra una
 * cadena vacia y siempre diera null, o sea que todo choque terminaba en un
 * "Datos duplicados." que no dice cual.
 */
export function camposDuplicados(error: unknown): string[] {
  const meta = (error as { meta?: MetaDuplicado })?.meta;

  const constraint = meta?.driverAdapterError?.cause?.constraint;
  if (Array.isArray(constraint?.fields)) return constraint.fields.map(String);
  // Algunos motores no devuelven las columnas sino el nombre del indice
  // ("usuarios_email_key"), que alcanza para reconocer el campo.
  if (typeof constraint?.index === "string") return [constraint.index];

  if (Array.isArray(meta?.target)) return meta.target.map(String);
  if (typeof meta?.target === "string") return [meta.target];

  return [];
}

/**
 * Mensajes de los choques que se dan al cargar un vendedor o su cuenta.
 * Devuelve null si el duplicado es de otra cosa, para que el llamador decida.
 */
export function erroresPorDuplicado(error: unknown): { errores: ErroresDeCampo } | null {
  const campos = camposDuplicados(error);

  if (campos.some((c) => c.includes("dni"))) {
    return { errores: { dni: ["Ya hay un vendedor con ese DNI."] } };
  }
  if (campos.some((c) => c.includes("codigo"))) {
    return { errores: { codigo: ["Ya hay un vendedor con ese código en esta zona."] } };
  }
  if (campos.some((c) => c.includes("email"))) {
    return { errores: { email: ["Ya hay una cuenta con ese email."] } };
  }
  return null;
}
