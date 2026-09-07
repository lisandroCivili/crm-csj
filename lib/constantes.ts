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

/**
 * Como se escribe el nombre de una zona en pantalla. En la base es un enum en
 * mayusculas y sin acento (SALTA, TUCUMAN); a la vista va con su ortografia.
 *
 * Vive aca y no en cada pantalla porque estaba copiado en tres archivos: el
 * header, el selector de zona y el perfil. Con dos zonas la copia no se nota,
 * pero una zona nueva saldria bien escrita en unas pantallas y en mayusculas
 * en otras, que es la clase de diferencia que nadie reporta como error.
 */
const ETIQUETA_ZONA: Record<string, string> = {
  SALTA: "Salta",
  TUCUMAN: "Tucumán",
};

export function etiquetaZona(nombre: string): string {
  return ETIQUETA_ZONA[nombre] ?? nombre;
}
