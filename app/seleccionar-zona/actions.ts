"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/sesion";
import { RUTA_INICIO, ZONA_COOKIE } from "@/lib/constantes";

const UN_ANIO = 60 * 60 * 24 * 365;

/**
 * Fija la zona activa del admin. La cookie solo define que subconjunto de datos
 * mira: los dos admins tienen acceso a ambas zonas, asi que manipularla no
 * habilita nada que no pudieran ver eligiendo la otra opcion.
 */
export async function seleccionarZona(formData: FormData) {
  await requireAdmin();

  const zonaId = Number(formData.get("zonaId"));
  const zona = Number.isInteger(zonaId)
    ? await db.zona.findUnique({ where: { id: zonaId } })
    : null;

  if (!zona) redirect("/seleccionar-zona");

  const volverA = String(formData.get("volverA") || "");
  const destino = volverA.startsWith("/") ? volverA : RUTA_INICIO.ADMIN;

  (await cookies()).set(ZONA_COOKIE, String(zona.id), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: UN_ANIO,
  });

  // Todo lo cacheado se calculo con la zona anterior.
  revalidatePath("/", "layout");
  redirect(destino);
}
