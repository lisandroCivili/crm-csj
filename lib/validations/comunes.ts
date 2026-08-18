import { z } from "zod";

/**
 * Campo de texto que puede venir vacio del formulario. Guardamos `null` en vez
 * de cadena vacia para que "sin dato" sea un solo valor en la base.
 */
export const textoOpcional = (max = 200) =>
  z
    .string()
    .trim()
    .max(max, `No puede superar los ${max} caracteres.`)
    .optional()
    .transform((valor) => (valor ? valor : null));

/** Email opcional: el formulario manda "" cuando lo dejan en blanco. */
export const emailOpcional = z
  .union([z.literal(""), z.string().trim().email("El email no es válido.")])
  .optional()
  .transform((valor) => (valor ? valor.toLowerCase() : null));

export const PASSWORD_MIN = 8;

/**
 * bcrypt solo mira los primeros 72 BYTES de la contrasena: de ahi en adelante
 * dos claves distintas que compartan el prefijo entran igual. El tope es del
 * algoritmo, no una decision de producto.
 *
 * El limite se cuenta en bytes y no en caracteres porque una enie o un emoji
 * ocupan mas de uno.
 */
export const PASSWORD_MAX_BYTES = 72;

export const passwordNueva = z
  .string()
  .min(PASSWORD_MIN, `Tiene que tener al menos ${PASSWORD_MIN} caracteres.`)
  .refine(
    (valor) => new TextEncoder().encode(valor).length <= PASSWORD_MAX_BYTES,
    "La contraseña es demasiado larga."
  );
