import type { Role } from "./generated/prisma/client";

/**
 * Datos propios que viajan en la sesion, compartidos entre la augmentacion de
 * tipos de Auth.js (types/next-auth.d.ts) y los callbacks.
 *
 * `zonaIdFija` solo aplica a los vendedores: su zona es fija y no la pueden
 * cambiar. Los admins tienen `null` porque eligen la zona activa despues de
 * loguearse (ver lib/sesion.ts).
 */
export type DatosUsuario = {
  role: Role;
  nombre: string;
  vendedorId: string | null;
  zonaIdFija: number | null;
};
