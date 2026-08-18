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

/** Que columna choco, para poder marcar el campo correcto del formulario. */
export function camposDuplicados(error: unknown): string[] {
  const target = (error as { meta?: { target?: unknown } })?.meta?.target;
  return Array.isArray(target) ? target.map(String) : [String(target ?? "")];
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
