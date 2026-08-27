"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin, requireZonaActivaId } from "@/lib/sesion";
import { objetivoContratosSchema, tramoAgenteSchema } from "@/lib/validations/comision";

/**
 * La escala del contrato de agencia es la unica fuente de los porcentajes que
 * el club le paga al agente: no hay ningun valor por defecto escondido en el
 * codigo. La migracion siembra el contrato vigente para que el sistema arranque
 * liquidando, pero de ahi en mas manda lo que este cargado aca.
 *
 * A diferencia de la escala del vendedor, esta SI es por zona: el objetivo
 * mensual difiere (Tucuman 50, Salta 100) y un contrato podria cambiar sin
 * arrastrar al otro.
 */

export type EstadoTramoAgente = {
  ok?: boolean;
  error?: string;
  errores?: Record<string, string[] | undefined>;
};

const SIN_TOPE = Number.POSITIVE_INFINITY;

function seSolapan(a: { min: number; max: number | null }, b: { min: number; max: number | null }) {
  return a.min <= (b.max ?? SIN_TOPE) && b.min <= (a.max ?? SIN_TOPE);
}

export async function guardarTramoAgente(
  _previo: EstadoTramoAgente,
  formData: FormData
): Promise<EstadoTramoAgente> {
  await requireAdmin();
  const zonaId = await requireZonaActivaId();

  const parsed = tramoAgenteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errores: z.flattenError(parsed.error).fieldErrors };

  const { cuotaDesde, cuotaHasta, porcentaje } = parsed.data;

  // Al editar un tramo, su piso original identifica la fila vieja: si Balta lo
  // mueve, hay que borrar la anterior.
  const crudoOriginal = formData.get("cuotaDesdeOriginal");
  const original = crudoOriginal === null || crudoOriginal === "" ? null : Number(crudoOriginal);

  const existentes = await db.escalaAgente.findMany({
    where: { zonaId },
    select: { cuotaDesde: true, cuotaHasta: true },
  });

  const conflicto = existentes
    .filter((tramo) => tramo.cuotaDesde !== original)
    .find((tramo) =>
      seSolapan(
        { min: cuotaDesde, max: cuotaHasta },
        { min: tramo.cuotaDesde, max: tramo.cuotaHasta }
      )
    );

  if (conflicto) {
    const rango =
      conflicto.cuotaHasta === null
        ? `${conflicto.cuotaDesde} en adelante`
        : `${conflicto.cuotaDesde} a ${conflicto.cuotaHasta}`;
    return {
      errores: {
        cuotaDesde: [`Se pisa con el tramo de la cuota ${rango}. Los tramos no pueden solaparse.`],
      },
    };
  }

  await db.$transaction(async (tx) => {
    if (original !== null && original !== cuotaDesde) {
      await tx.escalaAgente.deleteMany({ where: { zonaId, cuotaDesde: original } });
    }

    await tx.escalaAgente.upsert({
      where: { zonaId_cuotaDesde: { zonaId, cuotaDesde } },
      update: { cuotaHasta, porcentaje },
      create: { zonaId, cuotaDesde, cuotaHasta, porcentaje },
    });
  });

  revalidatePath("/admin/comisiones/agente/escala");
  revalidatePath("/admin/comisiones/agente");

  return { ok: true };
}

export async function eliminarTramoAgente(formData: FormData): Promise<void> {
  await requireAdmin();
  const zonaId = await requireZonaActivaId();

  const cuotaDesde = Number(formData.get("cuotaDesde"));
  if (!Number.isInteger(cuotaDesde)) return;

  await db.escalaAgente.deleteMany({ where: { zonaId, cuotaDesde } });

  revalidatePath("/admin/comisiones/agente/escala");
  revalidatePath("/admin/comisiones/agente");
}

/**
 * Contratos por mes que el contrato de agencia le pide a esta zona. Es
 * informativo: si no se llega, la liquidacion avisa pero calcula igual.
 */
export async function guardarObjetivo(
  _previo: EstadoTramoAgente,
  formData: FormData
): Promise<EstadoTramoAgente> {
  await requireAdmin();
  const zonaId = await requireZonaActivaId();

  const parsed = objetivoContratosSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errores: z.flattenError(parsed.error).fieldErrors };

  await db.zona.update({
    where: { id: zonaId },
    data: { objetivoContratosMensual: parsed.data.objetivo },
  });

  revalidatePath("/admin/comisiones/agente/escala");
  revalidatePath("/admin/comisiones/agente");

  return { ok: true };
}
