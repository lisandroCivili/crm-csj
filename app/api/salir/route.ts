import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { signOut } from "@/lib/auth";
import { ZONA_COOKIE } from "@/lib/constantes";

/**
 * Cierra la sesion y manda al login con un motivo.
 *
 * Existe porque un Server Component no puede borrar cookies: cuando el servidor
 * detecta que la cuenta ya no sirve (desactivada, dada de baja, con el rol
 * cambiado), no le alcanza con redirigir a /login — el middleware ve la cookie
 * todavia valida y devuelve al usuario a su ruta de inicio, que vuelve a
 * expulsarlo. Un route handler si puede cerrarla, y /api esta fuera del matcher
 * del middleware, asi que la ruta siempre es alcanzable.
 */
export async function GET(request: Request) {
  const motivo = new URL(request.url).searchParams.get("motivo") ?? "";

  (await cookies()).delete(ZONA_COOKIE);
  await signOut({ redirect: false });

  const destino = new URL("/login", request.url);
  if (motivo) destino.searchParams.set("motivo", motivo);

  return NextResponse.redirect(destino);
}
