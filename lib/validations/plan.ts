import { z } from "zod";

/**
 * Lo que Balta puede corregir a mano de un plan.
 *
 * `codigoProducto` no esta: es la clave con la que el Excel de precios encuentra
 * al plan (`upsert` por `codigoProducto`). Cambiarlo a mano haria que la proxima
 * lista de precios cree un plan nuevo en vez de actualizar este, y las ventas
 * viejas quedarian colgando del que ya no recibe precios.
 */
export const planSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, "Ingresá el nombre del plan.")
    .max(120, "No puede superar los 120 caracteres."),

  /** Cuantas cuotas dura el plan. El club maneja 30, 90 y 120 meses. */
  duracionMeses: z
    .union([
      z.literal(""),
      z.coerce
        .number()
        .int("Tiene que ser un número entero de meses.")
        .min(1, "La duración va de 1 a 600 meses.")
        .max(600, "La duración va de 1 a 600 meses."),
    ])
    .optional()
    .transform((valor) => (valor === "" || valor === undefined ? null : valor)),

  /**
   * Un plan inactivo no aparece en el formulario de venta, pero sigue existiendo:
   * las ventas viejas lo siguen apuntando. Es la forma de dar de baja un plan,
   * porque borrarlo no se puede (`Venta.planId` es una FK sin cascade).
   */
  activo: z
    .enum(["true", "false"], { message: "Elegí si el plan está activo." })
    .transform((valor) => valor === "true"),
});

export type DatosPlan = z.infer<typeof planSchema>;
