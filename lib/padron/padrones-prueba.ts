/**
 * COMO SE NOMBRAN LOS PADRONES DE PRUEBA
 *
 * `scripts/generar-padrones-prueba.ts` escribe un archivo por mes y por zona en
 * `docs/padrones-prueba`. La zona va en el nombre:
 *
 *   padron-prueba-01-2026-06.xlsx           -> SALTA
 *   padron-prueba-tucuman-01-2026-06.xlsx   -> TUCUMAN
 *
 * Salta no lleva marca porque sus archivos ya existian cuando Tucuman era una
 * zona sin datos, y renombrarlos habria invalidado las guias de prueba que los
 * nombran una por una.
 *
 * POR QUE ESTA REGLA VIVE ACA Y NO EN EL SCRIPT
 *
 * Porque el laboratorio (`/admin/laboratorio`) tiene que poder leer la zona de
 * un archivo para mostrar solo los de la zona activa. Antes listaba los catorce
 * seguidos, numerados del 1 al 14, y decia "importalos en orden": parado en
 * Salta, seguir esa instruccion al pie es importar el padron de Tucuman en la
 * zona equivocada. La importacion ahora lo frena —los numeros de titulo son
 * unicos en todo el club, asi que aparecen como titulos de otra zona— pero el
 * error lo inducia la pantalla.
 */

const PREFIJO = "padron-prueba-";

/** Lo que va entre `padron-prueba-` y el numero de archivo. Salta no lleva. */
export function sufijoZonaPadronPrueba(zona: string): string {
  return zona === "SALTA" ? "" : `${zona.toLowerCase()}-`;
}

/**
 * A que zona pertenece un padron de prueba, segun su nombre. Un archivo que no
 * sigue la convencion se cuenta como de Salta, que es la que no lleva marca.
 */
export function zonaDelPadronDePrueba(archivo: string): string {
  if (!archivo.startsWith(PREFIJO)) return "SALTA";
  const resto = archivo.slice(PREFIJO.length);
  const marca = resto.match(/^([a-z]+)-/);
  return marca ? marca[1].toUpperCase() : "SALTA";
}

/** Los padrones de prueba de una zona, en el orden en que hay que importarlos. */
export function padronesDeLaZona(archivos: string[], zona: string): string[] {
  return archivos.filter((a) => zonaDelPadronDePrueba(a) === zona).sort();
}
