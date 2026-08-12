"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { CUOTAS_COMISIONABLES } from "@/lib/comisiones/constantes";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/sesion";
import { tramoEscalaSchema } from "@/lib/validations/comision";

/**
 * La escala es la unica fuente de los porcentajes de comision: no hay ningun
 * valor por defecto escondido en el codigo. Si un tramo no esta cargado, la
 * liquidacion lo avisa en vez de inventar un numero.
 *
 * Las escalas NO se filtran por zona: son las mismas para Salta y Tucuman.
 */

export type EstadoTramo = {
  ok?: boolean;
  error?: string;
  errores?: Record<string, string[] | undefined>;
};

const SIN_TOPE = Number.POSITIVE_INFINITY;

function seSolapan(
  a: { min: number; max: number | null },
  b: { min: number; max: number | null }
): boolean {
  return a.min <= (b.max ?? SIN_TOPE) && b.min <= (a.max ?? SIN_TOPE);
}

export async function guardarTramo(
  _previo: EstadoTramo,
  formData: FormData
): Promise<EstadoTramo> {
  await requireAdmin();

  const parsed = tramoEscalaSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { errores: z.flattenError(parsed.error).fieldErrors };
  }

  const { ventasMin, ventasMax } = parsed.data;

  // Cuando se edita un tramo, su piso original identifica las filas viejas: si
  // Balta lo mueve, las anteriores hay que borrarlas.
  const crudoOriginal = formData.get("ventasMinOriginal");
  const ventasMinOriginal =
    crudoOriginal === null || crudoOriginal === "" ? null : Number(crudoOriginal);

  const existentes = await db.escalaComision.findMany({
    distinct: ["ventasMin"],
    select: { ventasMin: true, ventasMax: true },
  });

  const conflicto = existentes
    .filter((tramo) => tramo.ventasMin !== ventasMinOriginal)
    .find((tramo) =>
      seSolapan({ min: ventasMin, max: ventasMax }, { min: tramo.ventasMin, max: tramo.ventasMax })
    );

  if (conflicto) {
    const rango =
      conflicto.ventasMax === null
        ? `${conflicto.ventasMin} o más`
        : `${conflicto.ventasMin} a ${conflicto.ventasMax}`;
    return {
      errores: {
        ventasMin: [`Se pisa con el tramo de ${rango} ventas. Los tramos no pueden solaparse.`],
      },
    };
  }

  await db.$transaction(async (tx) => {
    if (ventasMinOriginal !== null && ventasMinOriginal !== ventasMin) {
      await tx.escalaComision.deleteMany({ where: { ventasMin: ventasMinOriginal } });
    }

    for (const numeroCuota of CUOTAS_COMISIONABLES) {
      const porcentaje = parsed.data[`porcentaje${numeroCuota}` as const];

      // Vacio no es 0 %: significa que esa cuota no esta cargada en el tramo, y
      // la liquidacion lo marca como pendiente en vez de pagar cero en silencio.
      if (porcentaje === null) {
        await tx.escalaComision.deleteMany({ where: { ventasMin, numeroCuota } });
        continue;
      }

      await tx.escalaComision.upsert({
        where: { ventasMin_numeroCuota: { ventasMin, numeroCuota } },
        update: { ventasMax, porcentaje },
        create: { ventasMin, ventasMax, numeroCuota, porcentaje },
      });
    }
  });

  revalidatePath("/admin/comisiones/escalas");
  revalidatePath("/admin/comisiones");

  return { ok: true };
}

export async function eliminarTramo(formData: FormData) {
  await requireAdmin();

  const ventasMin = Number(formData.get("ventasMin"));
  if (!Number.isInteger(ventasMin)) return;

  await db.escalaComision.deleteMany({ where: { ventasMin } });

  revalidatePath("/admin/comisiones/escalas");
  revalidatePath("/admin/comisiones");
}
