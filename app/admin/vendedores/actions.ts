"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin, requireZonaActivaId } from "@/lib/sesion";
import { usuarioVendedorSchema, vendedorSchema } from "@/lib/validations/vendedor";

export type EstadoFormulario = {
  error?: string;
  errores?: Record<string, string[] | undefined>;
};

/** Traduce la violacion de indice unico de Postgres al campo del formulario. */
function erroresPorDuplicado(error: unknown): EstadoFormulario | null {
  const target = (error as { meta?: { target?: unknown } })?.meta?.target;
  const campos = Array.isArray(target) ? target.map(String) : [String(target ?? "")];

  if (campos.some((c) => c.includes("dni"))) {
    return { errores: { dni: ["Ya hay un vendedor con ese DNI."] } };
  }
  if (campos.some((c) => c.includes("codigo"))) {
    return { errores: { codigo: ["Ya hay un vendedor con ese código en esta zona."] } };
  }
  if (campos.some((c) => c.includes("email"))) {
    return { errores: { email: ["Ya hay una cuenta con ese email."] } };
  }
  return null;
}

function esDuplicado(error: unknown): boolean {
  return (error as { code?: string })?.code === "P2002";
}

export async function crearVendedor(
  _previo: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  await requireAdmin();
  const zonaId = await requireZonaActivaId();

  const parsed = vendedorSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { errores: z.flattenError(parsed.error).fieldErrors };
  }

  let id: string;
  try {
    const vendedor = await db.vendedor.create({
      data: { ...parsed.data, zonaId },
      select: { id: true },
    });
    id = vendedor.id;
  } catch (error) {
    if (esDuplicado(error)) return erroresPorDuplicado(error) ?? { error: "Datos duplicados." };
    throw error;
  }

  revalidatePath("/admin/vendedores");
  redirect(`/admin/vendedores/${id}`);
}

export async function editarVendedor(
  _previo: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  await requireAdmin();
  const zonaId = await requireZonaActivaId();

  const id = String(formData.get("id") ?? "");
  const parsed = vendedorSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { errores: z.flattenError(parsed.error).fieldErrors };
  }

  try {
    // El filtro por zona evita editar un vendedor de la otra zona por id.
    const { count } = await db.vendedor.updateMany({
      where: { id, zonaId },
      data: parsed.data,
    });
    if (count === 0) return { error: "No se encontró el vendedor en esta zona." };
  } catch (error) {
    if (esDuplicado(error)) return erroresPorDuplicado(error) ?? { error: "Datos duplicados." };
    throw error;
  }

  revalidatePath("/admin/vendedores");
  revalidatePath(`/admin/vendedores/${id}`);
  redirect(`/admin/vendedores/${id}`);
}

export async function cambiarEstadoVendedor(formData: FormData) {
  await requireAdmin();
  const zonaId = await requireZonaActivaId();

  const id = String(formData.get("id") ?? "");
  const activo = formData.get("activo") === "true";

  await db.vendedor.updateMany({ where: { id, zonaId }, data: { activo } });

  revalidatePath("/admin/vendedores");
  revalidatePath(`/admin/vendedores/${id}`);
}

/**
 * Crea la cuenta con la que el vendedor entra al sistema. Es opcional: hay
 * vendedores que figuran en el padron y no usan el CRM.
 */
export async function crearUsuarioVendedor(
  _previo: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  await requireAdmin();
  const zonaId = await requireZonaActivaId();

  const id = String(formData.get("vendedorId") ?? "");
  const parsed = usuarioVendedorSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { errores: z.flattenError(parsed.error).fieldErrors };
  }

  const vendedor = await db.vendedor.findFirst({
    where: { id, zonaId },
    select: { id: true, nombreCompleto: true, userId: true },
  });

  if (!vendedor) return { error: "No se encontró el vendedor en esta zona." };
  if (vendedor.userId) return { error: "Este vendedor ya tiene una cuenta." };

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  try {
    await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: parsed.data.email.toLowerCase(),
          nombre: vendedor.nombreCompleto,
          role: "VENDEDOR",
          passwordHash,
        },
        select: { id: true },
      });
      await tx.vendedor.update({ where: { id: vendedor.id }, data: { userId: user.id } });
    });
  } catch (error) {
    if (esDuplicado(error)) return erroresPorDuplicado(error) ?? { error: "Datos duplicados." };
    throw error;
  }

  revalidatePath(`/admin/vendedores/${id}`);
  return {};
}
