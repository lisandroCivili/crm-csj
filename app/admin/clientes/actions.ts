"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { CAMPOS_PERSONALES } from "@/lib/padron/camposCliente";
import { requireAdmin, requireZonaActivaId } from "@/lib/sesion";
import { clienteSchema } from "@/lib/validations/cliente";

export type EstadoFormulario = {
  /** true solo despues de un envio que salio bien. */
  ok?: boolean;
  error?: string;
  errores?: Record<string, string[] | undefined>;
};

/**
 * Corrige los datos personales de un cliente.
 *
 * Cada campo que cambia queda anotado en `camposManuales`, y desde entonces la
 * importacion del padron deja de tocarlo. Sin esa marca, la correccion duraria
 * hasta el archivo siguiente: el padron pisa los datos personales en cada
 * importacion. Ver `lib/padron/camposCliente.ts`.
 *
 * Solo admin: el vendedor no ve la ficha del cliente.
 */
export async function editarCliente(
  _previo: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  const usuario = await requireAdmin();
  const zonaId = await requireZonaActivaId();

  const id = String(formData.get("id") ?? "");
  const parsed = clienteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { errores: z.flattenError(parsed.error).fieldErrors };
  }

  // El filtro por zona evita editar por id un cliente de la otra zona.
  const actual = await db.cliente.findFirst({ where: { id, zonaId } });
  if (!actual) return { error: "No se encontró el cliente en esta zona." };

  // Se marcan solo los campos que efectivamente cambiaron. Abrir el formulario
  // y guardar sin tocar nada no tiene que blindar los seis contra el padron.
  const cambiados = CAMPOS_PERSONALES.filter(
    (campo) => (actual[campo] ?? null) !== (parsed.data[campo] ?? null)
  );

  if (cambiados.length === 0) redirect(`/admin/clientes/${id}`);

  const manuales = [...new Set([...actual.camposManuales, ...cambiados])];

  await db.cliente.update({
    where: { id },
    data: {
      ...parsed.data,
      camposManuales: manuales,
      editadoPorUserId: usuario.id,
      editadoAt: new Date(),
    },
  });

  revalidatePath("/admin/clientes");
  revalidatePath(`/admin/clientes/${id}`);
  redirect(`/admin/clientes/${id}`);
}

/**
 * Saca todas las marcas de "corregido a mano": el proximo padron vuelve a
 * escribir los seis campos.
 *
 * No revierte los valores. El padron es el que manda el dato, asi que la
 * proxima importacion que traiga a este cliente los va a pisar sola; volver a
 * poner los viejos a mano requeriria guardarlos, y no hay para que.
 */
export async function volverATomarDelPadron(formData: FormData) {
  await requireAdmin();
  const zonaId = await requireZonaActivaId();

  const id = String(formData.get("id") ?? "");
  await db.cliente.updateMany({
    where: { id, zonaId },
    data: { camposManuales: [] },
  });

  revalidatePath("/admin/clientes");
  revalidatePath(`/admin/clientes/${id}`);
}
