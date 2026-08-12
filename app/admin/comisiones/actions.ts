"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { cerrarPeriodo, reabrirPeriodo } from "@/lib/comisiones/liquidacion";
import { db } from "@/lib/db";
import { requireAdmin, requireZonaActivaId } from "@/lib/sesion";
import { gastosRepresentacionSchema } from "@/lib/validations/comision";

export type ResultadoAccion = { ok?: boolean; error?: string };

/**
 * Importe manual que Balta agrega a la comision del mes. Se guarda apenas lo
 * carga, en un ComisionPeriodo en borrador: al cerrar el periodo ya esta ahi.
 */
export async function guardarGastos(datos: {
  vendedorId: string;
  periodo: string;
  importe: string;
}): Promise<ResultadoAccion> {
  await requireAdmin();
  const zonaId = await requireZonaActivaId();

  const parsed = gastosRepresentacionSchema.safeParse(datos);
  if (!parsed.success) {
    return { error: z.flattenError(parsed.error).fieldErrors.importe?.[0] ?? "Dato inválido." };
  }

  const { vendedorId, periodo, importe } = parsed.data;

  // El filtro por zona evita cargarle gastos a un vendedor de la otra zona.
  const vendedor = await db.vendedor.findFirst({
    where: { id: vendedorId, zonaId },
    select: { id: true },
  });
  if (!vendedor) return { error: "No se encontró el vendedor en esta zona." };

  const existente = await db.comisionPeriodo.findUnique({
    where: { vendedorId_periodo: { vendedorId, periodo } },
    select: { estado: true },
  });

  if (existente?.estado === "CERRADO") {
    return { error: "El período está cerrado. Reabrilo para poder modificarlo." };
  }

  await db.comisionPeriodo.upsert({
    where: { vendedorId_periodo: { vendedorId, periodo } },
    update: { gastosRepresentacion: importe },
    create: { vendedorId, periodo, zonaId, gastosRepresentacion: importe },
  });

  revalidatePath("/admin/comisiones");
  return { ok: true };
}

export async function cerrarPeriodoAccion(formData: FormData): Promise<void> {
  await requireAdmin();
  const zonaId = await requireZonaActivaId();

  const periodo = String(formData.get("periodo") ?? "");
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(periodo)) return;

  await cerrarPeriodo({ zonaId, periodo });

  revalidatePath("/admin/comisiones");
  revalidatePath("/vendedor/dashboard");
}

export async function reabrirPeriodoAccion(formData: FormData): Promise<void> {
  await requireAdmin();
  const zonaId = await requireZonaActivaId();

  const periodo = String(formData.get("periodo") ?? "");
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(periodo)) return;

  await reabrirPeriodo({ zonaId, periodo });

  revalidatePath("/admin/comisiones");
  revalidatePath("/vendedor/dashboard");
}
