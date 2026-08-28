import { z } from "zod";
import { emailOpcional, passwordNueva, textoOpcional } from "./comunes";

/**
 * Lo que cada uno puede cambiar de su propia cuenta.
 *
 * El nombre lo edita el admin y no el vendedor: `User.nombre` sale de
 * `Vendedor.nombreCompleto`, que ademas es dato de negocio (se cruza contra los
 * alias del padron). Si el vendedor se renombrara solo, las dos cosas quedarian
 * diciendo distinto.
 */

export const contactoAdminSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(3, "Ingresá tu nombre completo.")
    .max(120, "No puede superar los 120 caracteres."),
  telefono: textoOpcional(40),
  /**
   * Codigo con el que el club identifica al agente. Va como texto y no como
   * entero, igual que el DNI o el numero de suscripcion: es un identificador,
   * no una cantidad, y como numero se romperia uno que empiece con cero.
   */
  codigoAgente: textoOpcional(20),
});

export const contactoVendedorSchema = z.object({
  telefono: textoOpcional(40),
  email: emailOpcional,
  direccion: textoOpcional(),
});

export const cambioPasswordSchema = z
  .object({
    passwordActual: z.string().min(1, "Ingresá tu contraseña actual."),
    password: passwordNueva,
    passwordConfirmacion: z.string().min(1, "Repetí la contraseña nueva."),
  })
  .refine((datos) => datos.password === datos.passwordConfirmacion, {
    path: ["passwordConfirmacion"],
    message: "Las dos contraseñas tienen que coincidir.",
  })
  .refine((datos) => datos.password !== datos.passwordActual, {
    path: ["password"],
    message: "La nueva tiene que ser distinta de la actual.",
  });

export const cambioEmailSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("El email no es válido."),
  // Cambiar el email de ingreso deja afuera a quien se equivoque: se confirma
  // con la contrasena.
  passwordActual: z.string().min(1, "Ingresá tu contraseña para confirmar."),
});
