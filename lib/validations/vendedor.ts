import { z } from "zod";
import { emailOpcional, passwordNueva, textoOpcional } from "./comunes";

export const vendedorSchema = z.object({
  nombreCompleto: z
    .string()
    .trim()
    .min(3, "Ingresá el nombre completo.")
    .max(120, "No puede superar los 120 caracteres."),

  dni: z
    .string()
    .trim()
    .regex(/^\d{6,9}$/, "El DNI debe tener entre 6 y 9 números, sin puntos."),

  codigo: z
    .string()
    .trim()
    .min(1, "Ingresá el código del vendedor.")
    .max(20, "No puede superar los 20 caracteres."),

  direccion: textoOpcional(),

  email: emailOpcional,

  telefono: textoOpcional(40),

  /// Hasta que cuota cobra comision (c1 a c5). Lo define Balta por vendedor.
  topeCuotasComision: z.coerce
    .number()
    .int()
    .min(1, "El tope va de 1 a 5.")
    .max(5, "El tope va de 1 a 5."),

  /// Escala de comision asignada. Vacio = usa la predeterminada.
  escalaId: z
    .string()
    .trim()
    .optional()
    .transform((valor) => (valor ? valor : null)),

  condiciones: textoOpcional(1000),
});

export type DatosVendedor = z.infer<typeof vendedorSchema>;

export const usuarioVendedorSchema = z.object({
  email: z.string().trim().email("El email no es válido."),
  // Misma regla que el cambio de contrasena desde el perfil.
  password: passwordNueva,
});
