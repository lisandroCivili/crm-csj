import { z } from "zod";

/**
 * LOS CAMPOS DE LA VENTA
 *
 * Los definio Balta el 27/08/2026 armandolos en el prototipo. Dos de ellos no
 * son ni obligatorios ni opcionales siempre, sino que dependen de otro campo, y
 * esas dos reglas se validan aca —en el servidor— y no solo en la pantalla: el
 * formulario es un endpoint y se puede mandar sin pasar por el navegador.
 *
 *   - "Nro Suscripcion" es obligatorio, salvo que se cargue "Titulo".
 *   - "Observacion" es obligatoria cuando se carga "Nro Suscripcion".
 *
 * La primera sale de como identifica el club a una venta: arranca con un numero
 * de suscripcion y cuando le asignan el titulo definitivo, ese pasa a ser el
 * identificador. Una venta sin ninguno de los dos no se puede rastrear.
 */

const textoOpcional = (max = 200) =>
  z
    .string()
    .trim()
    .max(max, `No puede superar los ${max} caracteres.`)
    .optional()
    .transform((valor) => (valor ? valor : null));

/**
 * Los campos numericos se guardan como texto de digitos, no como numero.
 *
 * Un DNI, un telefono, un numero de suscripcion y un titulo son
 * identificadores, no cantidades: no se suman ni se promedian, y guardarlos
 * como entero rompe los que empiezan con cero (`0387…`, un DNI viejo de siete
 * digitos con cero adelante). Se aceptan espacios, guiones y parentesis al
 * escribir, y se limpian antes de guardar.
 */
/** Deja solo digitos: se acepta que el vendedor escriba con espacios y guiones. */
const limpiar = (valor: string) => valor.replace(/[\s().-]/g, "");

const SOLO_DIGITOS = /^\d+$/;

const soloDigitos = (etiqueta: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .transform(limpiar)
    .refine(
      (valor) => SOLO_DIGITOS.test(valor) && valor.length >= min && valor.length <= max,
      `${etiqueta} tiene que ser un número de entre ${min} y ${max} dígitos.`
    );

const digitosOpcional = (etiqueta: string, max: number) =>
  z
    .string()
    .trim()
    .transform(limpiar)
    .refine(
      (valor) => valor === "" || (SOLO_DIGITOS.test(valor) && valor.length <= max),
      `${etiqueta} tiene que ser un número de hasta ${max} dígitos.`
    )
    .transform((valor) => (valor === "" ? null : valor))
    .optional()
    .transform((valor) => valor ?? null);

export const ventaSchema = z
  .object({
    planId: z.string().min(1, "Elegí el plan."),

    nroSuscripcion: digitosOpcional("El número de suscripción", 20),

    // El DNI es la unica forma de reconocer despues a este cliente cuando el
    // titulo aparezca en un padron, asi que es obligatorio.
    dni: soloDigitos("El DNI", 6, 9),

    nombreCliente: z
      .string()
      .trim()
      .min(3, "Ingresá el nombre del cliente.")
      .max(120, "No puede superar los 120 caracteres."),

    direccion: z
      .string()
      .trim()
      .min(3, "Ingresá la calle, el número y el barrio.")
      .max(200, "No puede superar los 200 caracteres."),

    telefono: soloDigitos("El teléfono", 6, 20),

    numeroTitulo: digitosOpcional("El título", 20),

    observacion: textoOpcional(1000),
  })
  .superRefine((datos, ctx) => {
    // El numero de suscripcion identifica la venta hasta que el club asigna el
    // titulo. Con el titulo cargado deja de hacer falta; sin ninguno de los
    // dos, la venta no se puede rastrear.
    if (!datos.nroSuscripcion && !datos.numeroTitulo) {
      ctx.addIssue({
        code: "custom",
        path: ["nroSuscripcion"],
        message: "Cargá el número de suscripción, o el título si el club ya lo asignó.",
      });
    }

    if (datos.nroSuscripcion && !datos.observacion) {
      ctx.addIssue({
        code: "custom",
        path: ["observacion"],
        message: "La observación es obligatoria mientras la venta no tenga título.",
      });
    }
  });

export type DatosVenta = z.infer<typeof ventaSchema>;

/** Campos que se comparan para armar el historial de cambios. */
export const CAMPOS_HISTORIAL = [
  "nombreCliente",
  "dni",
  "telefono",
  "direccion",
  "nroSuscripcion",
  "numeroTitulo",
  "observacion",
  "planId",
  "codigoProducto",
] as const;

export const ETIQUETA_CAMPO: Record<string, string> = {
  nombreCliente: "Nombre y apellido",
  dni: "D.N.I",
  telefono: "Teléfono",
  direccion: "Calle Nro y Barrio",
  nroSuscripcion: "Nro Suscripción",
  numeroTitulo: "Título",
  observacion: "Observación",
  planId: "Plan",
  codigoProducto: "Código de producto",
  // Salieron del formulario, pero las ventas viejas los tienen en el historial.
  localidad: "Localidad",
  provincia: "Provincia",
  debitoAutomatico: "Débito automático",
};
