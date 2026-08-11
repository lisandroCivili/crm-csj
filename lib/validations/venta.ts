import { z } from "zod";

const textoOpcional = (max = 200) =>
  z
    .string()
    .trim()
    .max(max, `No puede superar los ${max} caracteres.`)
    .optional()
    .transform((valor) => (valor ? valor : null));

export const ventaSchema = z.object({
  nombreCliente: z
    .string()
    .trim()
    .min(3, "Ingresá el nombre del cliente.")
    .max(120, "No puede superar los 120 caracteres."),

  // El DNI es la unica forma de reconocer despues a este cliente cuando el
  // titulo aparezca en un padron, asi que es obligatorio.
  dni: z
    .string()
    .trim()
    .regex(/^\d{6,9}$/, "El DNI debe tener entre 6 y 9 números, sin puntos."),

  telefono: z
    .string()
    .trim()
    .min(6, "Ingresá un teléfono de contacto.")
    .max(40, "No puede superar los 40 caracteres."),

  direccion: textoOpcional(),
  localidad: textoOpcional(120),
  provincia: textoOpcional(120),

  planId: z.string().min(1, "Elegí el plan."),

  debitoAutomatico: z
    .union([z.literal("on"), z.literal("true"), z.literal("")])
    .optional()
    .transform((valor) => valor === "on" || valor === "true"),
});

export type DatosVenta = z.infer<typeof ventaSchema>;

/** Campos que se comparan para armar el historial de cambios. */
export const CAMPOS_HISTORIAL = [
  "nombreCliente",
  "dni",
  "telefono",
  "direccion",
  "localidad",
  "provincia",
  "planId",
  "codigoProducto",
  "debitoAutomatico",
] as const;

export const ETIQUETA_CAMPO: Record<string, string> = {
  nombreCliente: "Nombre del cliente",
  dni: "DNI",
  telefono: "Teléfono",
  direccion: "Dirección",
  localidad: "Localidad",
  provincia: "Provincia",
  planId: "Plan",
  codigoProducto: "Código de producto",
  debitoAutomatico: "Débito automático",
};
