"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { cerrarPeriodoAgente, reabrirPeriodoAgente } from "@/lib/comisiones/liquidacionAgente";
import { db } from "@/lib/db";
import { requireAdmin, requireZonaActivaId } from "@/lib/sesion";
import { gastosAgenteSchema } from "@/lib/validations/comision";

export type ResultadoAccion = { ok?: boolean; error?: string };

/**
 * Gastos de representacion del mes. NO se suman a la comision (Balta,
 * 27/08/2026): el club los paga aparte como reintegro y los ajusta por
 * inflacion, asi que el importe se carga a mano y solo entra en el balance.
 */
export async function guardarGastosAgente(datos: {
  periodo: string;
  importe: string;
}): Promise<ResultadoAccion> {
  await requireAdmin();
  const zonaId = await requireZonaActivaId();

  const parsed = gastosAgenteSchema.safeParse(datos);
  if (!parsed.success) {
    return { error: z.flattenError(parsed.error).fieldErrors.importe?.[0] ?? "Dato inválido." };
  }

  const { periodo, importe } = parsed.data;

  const existente = await db.comisionAgentePeriodo.findUnique({
    where: { zonaId_periodo: { zonaId, periodo } },
    select: { estado: true },
  });

  if (existente?.estado === "CERRADO") {
    return { error: "El período está cerrado. Reabrilo para poder modificarlo." };
  }

  await db.comisionAgentePeriodo.upsert({
    where: { zonaId_periodo: { zonaId, periodo } },
    update: { gastosRepresentacion: importe },
    create: { zonaId, periodo, gastosRepresentacion: importe },
  });

  revalidatePath("/admin/comisiones/agente");
  return { ok: true };
}

const PERIODO = /^\d{4}-(0[1-9]|1[0-2])$/;

export async function cerrarPeriodoAgenteAccion(formData: FormData): Promise<void> {
  await requireAdmin();
  const zonaId = await requireZonaActivaId();

  const periodo = String(formData.get("periodo") ?? "");
  if (!PERIODO.test(periodo)) return;

  await cerrarPeriodoAgente({ zonaId, periodo });

  revalidatePath("/admin/comisiones/agente");
  revalidatePath("/admin/dashboard");
}

export async function reabrirPeriodoAgenteAccion(formData: FormData): Promise<void> {
  await requireAdmin();
  const zonaId = await requireZonaActivaId();

  const periodo = String(formData.get("periodo") ?? "");
  if (!PERIODO.test(periodo)) return;

  await reabrirPeriodoAgente({ zonaId, periodo });

  revalidatePath("/admin/comisiones/agente");
  revalidatePath("/admin/dashboard");
}
