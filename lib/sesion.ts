import type { Session } from "next-auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "./auth";
import { db } from "./db";
import { RUTA_INICIO, ZONA_COOKIE } from "./constantes";
import type { Role } from "./generated/prisma/client";

export type Sesion = Session;

/**
 * Que secciones ve el usuario. Para el admin son todas; para el vendedor las
 * define Balta desde su ficha.
 */
export type Permisos = {
  verLeads: boolean;
  cargarVentas: boolean;
  verComision: boolean;
};

const PERMISOS_ADMIN: Permisos = { verLeads: true, cargarVentas: true, verComision: true };

export type Usuario = {
  id: string;
  email: string;
  nombre: string;
  role: Role;
  vendedorId: string | null;
  zonaIdFija: number | null;
  permisos: Permisos;
};

/**
 * SESION
 *
 * El JWT es un documento de identidad, no de autorizacion: lo unico que se le
 * cree es de quien es la sesion (`token.sub`). El rol, el nombre, el email, el
 * estado de la cuenta y los permisos salen de la base en cada request.
 *
 * La razon es que la sesion es JWT puro y sus claims se escriben una sola vez,
 * al iniciar sesion. Si Balta le saca un permiso a un vendedor, o lo da de baja,
 * el token de esa persona no se entera y seguiria entrando por semanas.
 * `unstable_update` no resuelve esto: solo refresca la sesion de quien la
 * invoca, nunca la de un tercero.
 *
 * El costo es un findUnique por clave primaria, memoizado con `cache()` para
 * que el layout y la pagina del mismo render no lo repitan. Nunca cachear esto
 * entre requests (`unstable_cache`, `"use cache"`): reintroduce el problema.
 *
 * El middleware (proxy.ts) sigue decidiendo con los claims del token porque
 * corre en edge y no puede consultar Prisma. Eso alcanza para rutear; el corte
 * fino lo hace el servidor, aca.
 */
export const getSesion = cache(async () => auth());

export const getUsuarioActual = cache(async (): Promise<Usuario | null> => {
  const sesion = await getSesion();
  const id = sesion?.user?.id;
  if (!id) return null;

  const user = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      nombre: true,
      role: true,
      activo: true,
      vendedores: {
        select: {
          id: true,
          zonaId: true,
          activo: true,
          puedeVerLeads: true,
          puedeCargarVentas: true,
          puedeVerComision: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!user || !user.activo) return null;

  // La ficha de vendedor es por zona. Un vendedor comun tiene una sola, y es la
  // que manda: su zona no es negociable. Balta y Pedro tienen una en cada zona,
  // asi que para ellos `vendedorId` no significa nada aca; la ficha que
  // corresponde depende de la zona activa y la resuelve `getVendedorDelAdmin`.
  const ficha = user.role === "VENDEDOR" ? (user.vendedores[0] ?? null) : null;

  // Misma regla que el login: un vendedor dado de baja no entra aunque su
  // usuario siga activo.
  if (user.role === "VENDEDOR" && !ficha?.activo) return null;

  return {
    id: user.id,
    email: user.email,
    nombre: user.nombre,
    role: user.role,
    vendedorId: ficha?.id ?? null,
    zonaIdFija: ficha?.zonaId ?? null,
    permisos:
      user.role === "ADMIN"
        ? PERMISOS_ADMIN
        : {
            verLeads: ficha?.puedeVerLeads ?? false,
            cargarVentas: ficha?.puedeCargarVentas ?? false,
            verComision: ficha?.puedeVerComision ?? false,
          },
  };
});

/**
 * La ficha de vendedor del admin en la zona activa, si la tiene.
 *
 * Balta y Pedro son agentes: ademas de administrar, venden en las dos zonas y
 * cobran comision por sus propios titulos. Como la ficha es por zona, cual de
 * las dos aplica depende de la zona que tengan elegida en ese momento.
 *
 * Devuelve null para los vendedores comunes (su ficha ya esta en `vendedorId`)
 * y para los admins que no venden.
 */
export const getVendedorDelAdmin = cache(async () => {
  const usuario = await getUsuarioActual();
  if (!usuario || usuario.role !== "ADMIN") return null;

  const zonaId = await getZonaActivaId();
  if (zonaId === null) return null;

  return db.vendedor.findFirst({
    where: { userId: usuario.id, zonaId, activo: true },
    select: { id: true, nombreCompleto: true, codigo: true, zonaId: true },
  });
});

/**
 * Salida forzada. No se puede redirigir a /login con la cookie viva: el
 * middleware ve la sesion y devuelve al usuario a su ruta de inicio, que vuelve
 * a expulsarlo. Ese ida y vuelta es un bucle infinito.
 *
 * /api/salir cierra la sesion de verdad antes de mandar al login. Vive bajo
 * /api porque el matcher del middleware excluye ese prefijo y porque un route
 * handler si puede borrar cookies (un Server Component no).
 */
function salir(motivo: "cuenta-inactiva" | "sesion-vencida"): never {
  redirect(`/api/salir?motivo=${motivo}`);
}

export async function requireUsuario(): Promise<Usuario> {
  const sesion = await getSesion();
  if (!sesion?.user) redirect("/login");

  const usuario = await getUsuarioActual();
  // Habia sesion pero la cuenta ya no sirve: la borraron o la desactivaron
  // mientras la persona navegaba.
  if (!usuario) salir("cuenta-inactiva");

  // El token dice un rol y la base dice otro. Si lo dejaramos pasar, el
  // middleware y el servidor se lo pasarian de uno al otro para siempre.
  if (usuario.role !== sesion.user.role) salir("sesion-vencida");

  return usuario;
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

/**
 * Igual que `requireVendedor` pero ademas exige un permiso. Si no lo tiene,
 * vuelve al dashboard sin explicaciones: la seccion no es un secreto, y es el
 * mismo rebote silencioso que ya hace el sistema con los roles.
 */
export async function requirePermiso(
  permiso: keyof Permisos
): Promise<Usuario & { vendedorId: string }> {
  const usuario = await requireVendedor();
  if (!usuario.permisos[permiso]) redirect(RUTA_INICIO.VENDEDOR);
  return usuario;
}

// ---------------------------------------------------------------------------
// Zona activa
//
// Toda query de negocio se filtra por la zona activa. Para el vendedor es la
// zona fija de su perfil; para el admin, la que eligio despues de loguearse.
// ---------------------------------------------------------------------------

/**
 * No redirige: devuelve null si no hay sesion util o si el admin todavia no
 * eligio zona. Asi la puede usar tambien un route handler, donde un redirect
 * seria una respuesta HTTP y no lo que se espera de una descarga.
 */
export async function getZonaActivaId(): Promise<number | null> {
  const usuario = await getUsuarioActual();
  if (!usuario) return null;

  // La zona del vendedor no es negociable: ignoramos la cookie a proposito.
  if (usuario.role === "VENDEDOR") return usuario.zonaIdFija;

  const valor = (await cookies()).get(ZONA_COOKIE)?.value;
  const id = Number(valor);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** Igual que `getZonaActivaId` pero manda al selector si todavia no eligio. */
export async function requireZonaActivaId(): Promise<number> {
  await requireUsuario();
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
