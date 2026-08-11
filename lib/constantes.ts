/**
 * Constantes compartidas entre el middleware (runtime edge) y el servidor.
 * Este archivo no debe importar nada: el middleware no puede cargar Prisma.
 */

/** Cookie donde el admin guarda la zona que tiene activa. */
export const ZONA_COOKIE = "zona_activa";

export const RUTA_INICIO = {
  ADMIN: "/admin/dashboard",
  VENDEDOR: "/vendedor/dashboard",
} as const;
