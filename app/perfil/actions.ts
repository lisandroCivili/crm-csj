"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { signOut } from "@/lib/auth";
import { ZONA_COOKIE } from "@/lib/constantes";
import { db } from "@/lib/db";
import { esDuplicado } from "@/lib/errores-prisma";
import { requireUsuario } from "@/lib/sesion";
import {
  cambioEmailSchema,
  cambioPasswordSchema,
  contactoAdminSchema,
  contactoVendedorSchema,
} from "@/lib/validations/perfil";

export type EstadoPerfil = {
  ok?: boolean;
  error?: string;
  errores?: Record<string, string[] | undefined>;
};

/** Igual que en el login: el hash se genera con cost 10. */
const COSTO_BCRYPT = 10;

async function passwordCorrecta(userId: string, password: string): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });
  if (!user) return false;
  return bcrypt.compare(password, user.passwordHash);
}

/**
 * Datos de contacto. El admin edita su nombre y telefono; el vendedor, los
 * datos de su ficha, que son los que mira Balta.
 */
export async function actualizarContacto(
  _previo: EstadoPerfil,
  formData: FormData
): Promise<EstadoPerfil> {
  const usuario = await requireUsuario();
  const datos = Object.fromEntries(formData);

  if (usuario.role === "ADMIN") {
    const parsed = contactoAdminSchema.safeParse(datos);
    if (!parsed.success) return { errores: z.flattenError(parsed.error).fieldErrors };

    await db.user.update({ where: { id: usuario.id }, data: parsed.data });
  } else {
    const parsed = contactoVendedorSchema.safeParse(datos);
    if (!parsed.success) return { errores: z.flattenError(parsed.error).fieldErrors };
    if (!usuario.vendedorId) return { error: "No encontramos tu ficha de vendedor." };

    await db.vendedor.update({ where: { id: usuario.vendedorId }, data: parsed.data });
  }

  // El nombre vive en el encabezado, que se arma en el layout.
  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Cambio de contrasena propio.
 *
 * Al terminar cierra la sesion: con JWT no hay forma de invalidar la cookie
 * vieja, y entrar de nuevo con la clave nueva es lo que la gente espera despues
 * de cambiarla.
 */
export async function cambiarPassword(
  _previo: EstadoPerfil,
  formData: FormData
): Promise<EstadoPerfil> {
  const usuario = await requireUsuario();

  const parsed = cambioPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errores: z.flattenError(parsed.error).fieldErrors };

  // Aca no hay nada que ocultar: la persona ya esta autenticada y esta es su
  // propia clave, asi que el error va en el campo que corresponde.
  if (!(await passwordCorrecta(usuario.id, parsed.data.passwordActual))) {
    return { errores: { passwordActual: ["La contraseña actual no es correcta."] } };
  }

  await db.user.update({
    where: { id: usuario.id },
    data: { passwordHash: await bcrypt.hash(parsed.data.password, COSTO_BCRYPT) },
  });

  // Con JWT no hay forma de invalidar la cookie vieja, asi que se cierra la
  // sesion y se entra de nuevo con la clave nueva. `signOut` redirige solo.
  (await cookies()).delete(ZONA_COOKIE);
  await signOut({ redirectTo: "/login?motivo=password-cambiada" });

  return { ok: true };
}

/** Cambio del email con el que se inicia sesion. */
export async function cambiarEmail(
  _previo: EstadoPerfil,
  formData: FormData
): Promise<EstadoPerfil> {
  const usuario = await requireUsuario();

  const parsed = cambioEmailSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errores: z.flattenError(parsed.error).fieldErrors };

  if (parsed.data.email === usuario.email) {
    return { errores: { email: ["Es el mismo email que ya tenías."] } };
  }

  if (!(await passwordCorrecta(usuario.id, parsed.data.passwordActual))) {
    return { errores: { passwordActual: ["La contraseña no es correcta."] } };
  }

  try {
    await db.user.update({
      where: { id: usuario.id },
      data: { email: parsed.data.email },
    });
  } catch (error) {
    if (esDuplicado(error)) {
      return { errores: { email: ["Ya hay una cuenta con ese email."] } };
    }
    throw error;
  }

  // La sesion sobrevive: el token guarda el id, no el email.
  revalidatePath("/", "layout");
  return { ok: true };
}
