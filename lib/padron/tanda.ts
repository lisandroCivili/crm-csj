/**
 * Una TANDA es el conjunto de padrones que se suben de una vez.
 *
 * Vive aca y no en `app/admin/padron/actions.ts` porque lo necesitan los dos
 * lados: el servidor para ordenar y rechazar, y la pantalla para avisar antes
 * de que el admin espere la subida de 20 MB para enterarse. Ademas un archivo
 * `"use server"` solo puede exportar funciones async, asi que ni una constante
 * ni una funcion pura podrian salir de ahi.
 */

/**
 * Tope de archivos por tanda. No es un numero elegido por prolijidad: el
 * `bodySizeLimit` de las server actions es de 25 MB para TODA la request
 * (`next.config.ts`) y un padron real pesa cerca de 2 MB. Pasado ese techo la
 * subida falla antes de llegar a la accion, o sea sin ningun mensaje que se
 * pueda entender: por eso el aviso tiene que salir tambien del navegador.
 */
export const MAXIMO_ARCHIVOS = 10;

/** Por archivo. */
export const TAMANIO_MAXIMO = 25 * 1024 * 1024;

/** Toda la tanda junta. Es el `bodySizeLimit` de `next.config.ts`. */
export const TAMANIO_MAXIMO_TANDA = 25 * 1024 * 1024;

export type ArchivoOrdenable = {
  /** La emision mas vieja del archivo, como la devuelve `parsePadron`. */
  periodoDesde: Date | null;
  nombre: string;
};

/**
 * EL ORDEN DE IMPORTACION IMPORTA, Y NO ES EL DE LA SELECCION.
 *
 * `origenDeTituloNuevo` decide venta nueva vs. renovacion comparando contra lo
 * que ya hay cargado, y `esLineaBase` mira si la zona tiene algun padron
 * importado. Los dos dependen de que los archivos entren del mas viejo al mas
 * nuevo: al reves, un titulo que renovo en septiembre quedaria como venta
 * nueva porque su cuota 1 llega en un archivo posterior.
 *
 * Por eso lo decide el periodo que trae el archivo y no en que orden lo eligio
 * el admin —el explorador de Windows los entrega alfabeticamente, que con los
 * nombres del club no es lo mismo—, y por eso se muestra antes de confirmar.
 *
 * Un archivo sin periodo va al final: no se puede afirmar que sea el mas
 * viejo, y adelantarlo si podria arruinar la clasificacion de los demas.
 */
export function ordenDeImportacion(a: ArchivoOrdenable, b: ArchivoOrdenable): number {
  const ta = a.periodoDesde?.getTime() ?? Number.POSITIVE_INFINITY;
  const tb = b.periodoDesde?.getTime() ?? Number.POSITIVE_INFINITY;
  return ta - tb || a.nombre.localeCompare(b.nombre, "es");
}

/**
 * Ordena una tanda sin tocar el arreglo original. `clave` saca el periodo y el
 * nombre de lo que sea que este ordenando: en la accion son archivos ya
 * parseados, en los tests son fichas de dos campos.
 */
export function ordenarTanda<T>(archivos: T[], clave: (archivo: T) => ArchivoOrdenable): T[] {
  return [...archivos].sort((a, b) => ordenDeImportacion(clave(a), clave(b)));
}
