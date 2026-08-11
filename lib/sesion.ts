import type { Session } from "next-auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "./auth";
import { db } from "./db";
import { RUTA_INICIO, ZONA_COOKIE } from "./constantes";

// `auth` tiene varias sobrecargas (middleware, route handler y llamada
// directa), asi que derivar el tipo con ReturnType devuelve la equivocada.
export type Sesion = Session;
export type Usuario = Session["user"];

/**
 * Sesion del request actual. Va memoizada con `cache` para que varios
 * componentes del mismo render no repitan la verificacion.
 */
export const getSesion = cache(async () => auth());

export async function requireUsuario(): Promise<Usuario> {
  const sesion = await getSesion();
  if (!sesion?.user) redirect("/login");
  return sesion.user;
}

export async function requireAdmin(): Promise<Usuario> {
  const usuario = await requireUsuario();
  if (usuario.role !== "ADMIN") redirect(RUTA_INICIO[usuario.role]);
  return usuario;
}

export async function requireVendedor(): Promise<Usuario & { vendedorId: string }> {
  const usuario = await requireUsuario();
  if (usuario.role !== "VENDEDOR" || !usuario.vendedorId) {
    redirect(RUTA_INICIO[usuario.role]);
  }
  return usuario as Usuario & { vendedorId: string };
}

// ---------------------------------------------------------------------------
// Zona activa
//
// Toda query de negocio se filtra por la zona activa. Para el vendedor es la
// zona fija de su perfil; para el admin, la que eligio despues de loguearse.
// ---------------------------------------------------------------------------

export async function getZonaActivaId(): Promise<number | null> {
  const usuario = await requireUsuario();

  // La zona del vendedor no es negociable: ignoramos la cookie a proposito.
  if (usuario.role === "VENDEDOR") return usuario.zonaIdFija;

  const valor = (await cookies()).get(ZONA_COOKIE)?.value;
  const id = Number(valor);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** Igual que `getZonaActivaId` pero manda al selector si todavia no eligio. */
export async function requireZonaActivaId(): Promise<number> {
  const id = await getZonaActivaId();
  if (id === null) redirect("/seleccionar-zona");
  return id;
}

export const getZonaActiva = cache(async () => {
  const id = await getZonaActivaId();
  if (id === null) return null;
  return db.zona.findUnique({ where: { id } });
});

export const listarZonas = cache(async () => db.zona.findMany({ orderBy: { nombre: "asc" } }));
