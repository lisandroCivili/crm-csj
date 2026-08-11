import { z } from "zod";

export const ESTADOS_LEAD = ["PENDIENTE", "VENDIDO", "NO_VENDIDO", "DEVOLUCION"] as const;

export const ETIQUETA_ESTADO: Record<(typeof ESTADOS_LEAD)[number], string> = {
  PENDIENTE: "Pendiente",
  VENDIDO: "Vendido",
  NO_VENDIDO: "No vendido",
  DEVOLUCION: "Devolución",
};

export const ETIQUETA_ORIGEN = {
  CLUB: "Del club",
  PROPIO: "Propio",
} as const;

export const cambioEstadoSchema = z
  .object({
    leadId: z.string().min(1),
    estado: z.enum(ESTADOS_LEAD),
    motivoDevolucion: z
      .string()
      .trim()
      .max(500, "No puede superar los 500 caracteres.")
      .optional()
      .transform((valor) => (valor ? valor : null)),
  })
  // Devolver un lead sin explicar por que deja al admin sin informacion para
  // decidir a quien reasignarlo.
  .refine((datos) => datos.estado !== "DEVOLUCION" || Boolean(datos.motivoDevolucion), {
    message: "Contá por qué lo devolvés.",
    path: ["motivoDevolucion"],
  });
