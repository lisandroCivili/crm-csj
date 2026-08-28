import { z } from "zod";
import { emailOpcional, textoOpcional } from "./comunes";

/**
 * LOS DATOS PERSONALES DEL CLIENTE
 *
 * Los escribe la importacion del padron, y desde la Fase 10 tambien el admin.
 * Lo que corrige a mano le gana al club: ver `lib/padron/camposCliente.ts`.
 *
 * **El DNI no esta.** Es la clave `@@unique([zonaId, dni])` y es con lo que el
 * padron reconoce al cliente: cambiarlo a mano no corregiria nada, crearia un
 * cliente duplicado en la importacion siguiente y dejaria los titulos colgando
 * del viejo. Si el club tiene el DNI mal, hay que pedirle al club que lo
 * corrija.
 *
 * El telefono va como texto libre y no como digitos —al reves que en el
 * formulario de venta—: este campo lo llena el padron, que trae cosas como
 * "4231234 / 155-667788". Normalizarlo a digitos al editarlo dejaria un valor
 * que el club nunca escribio.
 */
export const clienteSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(3, "Ingresá el nombre del cliente.")
    .max(120, "No puede superar los 120 caracteres."),

  domicilio: textoOpcional(200),

  localidad: textoOpcional(100),

  codPos: textoOpcional(20),

  telefono: textoOpcional(40),

  email: emailOpcional,
});

export type DatosCliente = z.infer<typeof clienteSchema>;
