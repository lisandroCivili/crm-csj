/**
 * QUE CAMPOS DEL CLIENTE PUEDE PISAR EL PADRON
 *
 * Los datos personales del cliente (nombre, domicilio, telefono, codigo postal,
 * localidad y email) los escribe la importacion del padron. Hasta ahora los
 * escribia SIEMPRE y todos juntos, con dos consecuencias:
 *
 *   1. Un dato corregido a mano duraba hasta el padron siguiente. Balta corrige
 *      un telefono porque llamo al cliente y el club lo tiene mal, y el proximo
 *      archivo lo vuelve a poner mal.
 *   2. Si al Excel le faltaba una columna opcional entera, `parsePadron`
 *      devolvia `null` para toda la zona y la importacion BORRABA ese dato de
 *      todos los clientes del archivo. "La celda esta vacia" y "la columna no
 *      vino" llegaban indistinguibles.
 *
 * Este modulo resuelve las dos cosas y es pura funcion para poder testearlo:
 * decide que campos toca el padron y arma el update, sin hablar con la base.
 *
 * La regla, definida por Lisandro el 28/08/2026: **manda el dato corregido**.
 * El campo editado a mano queda anotado en `Cliente.camposManuales` y el padron
 * deja de tocarlo, hasta que alguien apriete "volver a tomar todo del padron".
 * Es el mismo criterio que ya rige para `Titulo.origen`: hay datos que se
 * sellan y no se recalculan.
 */

export const CAMPOS_PERSONALES = [
  "nombre",
  "domicilio",
  "telefono",
  "codPos",
  "localidad",
  "email",
] as const;

export type CampoPersonal = (typeof CAMPOS_PERSONALES)[number];

export const ETIQUETA_CAMPO_PERSONAL: Record<CampoPersonal, string> = {
  nombre: "Nombre",
  domicilio: "Domicilio",
  telefono: "Teléfono",
  codPos: "Código postal",
  localidad: "Localidad",
  email: "Email",
};

/** Lo que el padron trae de una persona. `null` = la celda vino vacia. */
export type DatosPersonales = Record<CampoPersonal, string | null>;

export function esCampoPersonal(valor: string): valor is CampoPersonal {
  return (CAMPOS_PERSONALES as readonly string[]).includes(valor);
}

/**
 * De los campos personales, cuales puede escribir esta importacion.
 *
 * Se descartan los que no vinieron como columna en el Excel —no se puede
 * afirmar que esten vacios: sencillamente no se informaron— y los que el admin
 * corrigio a mano.
 */
export function camposQueEscribeElPadron(
  columnasDelArchivo: readonly CampoPersonal[],
  camposManuales: readonly string[]
): CampoPersonal[] {
  return CAMPOS_PERSONALES.filter(
    (campo) => columnasDelArchivo.includes(campo) && !camposManuales.includes(campo)
  );
}

/**
 * Los campos a actualizar de un cliente que ya existe, o `null` si el padron no
 * trae ninguna novedad para el.
 *
 * Devolver `null` importa: si se mandara un `update` vacio, cada importacion
 * contaria a todos los clientes del archivo como "actualizados" y tocaria su
 * `updatedAt` sin haber cambiado nada.
 */
export function cambiosDelCliente(
  existente: Partial<DatosPersonales> & { camposManuales?: readonly string[] },
  delPadron: DatosPersonales,
  columnasDelArchivo: readonly CampoPersonal[]
): Partial<DatosPersonales> | null {
  const escribibles = camposQueEscribeElPadron(
    columnasDelArchivo,
    existente.camposManuales ?? []
  );

  const cambios: Partial<DatosPersonales> = {};
  for (const campo of escribibles) {
    // `nombre` es obligatorio en la base: si el padron lo trae vacio no se
    // pisa el que ya estaba con un null que la columna no aceptaria.
    if (campo === "nombre" && !delPadron.nombre) continue;
    if ((existente[campo] ?? null) !== delPadron[campo]) {
      cambios[campo] = delPadron[campo];
    }
  }

  return Object.keys(cambios).length > 0 ? cambios : null;
}

/**
 * Los datos con los que se crea un cliente nuevo. Las columnas que no vinieron
 * en el archivo quedan en `null`, que para un cliente que todavia no existe es
 * lo mismo que no informarlas.
 */
export function datosDeClienteNuevo(
  delPadron: DatosPersonales,
  columnasDelArchivo: readonly CampoPersonal[]
): DatosPersonales {
  const datos = {} as DatosPersonales;
  for (const campo of CAMPOS_PERSONALES) {
    datos[campo] = columnasDelArchivo.includes(campo) ? delPadron[campo] : null;
  }
  return datos;
}
