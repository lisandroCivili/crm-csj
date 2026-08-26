"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { CUOTAS_COMISIONABLES } from "@/lib/comisiones/constantes";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/sesion";
import { nombreEscalaSchema, tramoEscalaSchema } from "@/lib/validations/comision";

/**
 * La escala es la unica fuente de los porcentajes de comision: no hay ningun
 * valor por defecto escondido en el codigo. Si un tramo no esta cargado, la
 * liquidacion lo avisa en vez de inventar un numero.
 *
 * Las escalas NO se filtran por zona: son las mismas para Salta y Tucuman. Lo
 * que cambia por vendedor es cual escala tiene asignada (`Vendedor.escalaId`).
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

  const escalaId = String(formData.get("escalaId") ?? "");
  if (!escalaId) return { error: "Falta la escala." };

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
    where: { escalaId },
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
      await tx.escalaComision.deleteMany({ where: { escalaId, ventasMin: ventasMinOriginal } });
    }

    for (const numeroCuota of CUOTAS_COMISIONABLES) {
      const porcentaje = parsed.data[`porcentaje${numeroCuota}` as const];

      // Vacio no es 0 %: significa que esa cuota no esta cargada en el tramo, y
      // la liquidacion lo marca como pendiente en vez de pagar cero en silencio.
      if (porcentaje === null) {
        await tx.escalaComision.deleteMany({ where: { escalaId, ventasMin, numeroCuota } });
        continue;
      }

      await tx.escalaComision.upsert({
        where: { escalaId_ventasMin_numeroCuota: { escalaId, ventasMin, numeroCuota } },
        update: { ventasMax, porcentaje },
        create: { escalaId, ventasMin, ventasMax, numeroCuota, porcentaje },
      });
    }
  });

  revalidatePath(`/admin/comisiones/escalas/${escalaId}`);
  revalidatePath("/admin/comisiones");

  return { ok: true };
}

export async function eliminarTramo(formData: FormData) {
  await requireAdmin();

  const escalaId = String(formData.get("escalaId") ?? "");
  const ventasMin = Number(formData.get("ventasMin"));
  if (!escalaId || !Number.isInteger(ventasMin)) return;

  await db.escalaComision.deleteMany({ where: { escalaId, ventasMin } });

  revalidatePath(`/admin/comisiones/escalas/${escalaId}`);
  revalidatePath("/admin/comisiones");
}

// ---------------------------------------------------------------------------
// CRUD de la escala en si (cabecera)
// ---------------------------------------------------------------------------

export async function crearEscala(_previo: EstadoTramo, formData: FormData): Promise<EstadoTramo> {
  await requireAdmin();

  const parsed = nombreEscalaSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errores: z.flattenError(parsed.error).fieldErrors };

  // La primera escala que se crea queda predeterminada de arranque: siempre
  // tiene que haber una, y si es la unica no hay otra opcion razonable.
  const hayAlguna = (await db.escala.count()) > 0;

  const escala = await db.escala.create({
    data: { nombre: parsed.data.nombre, esPredeterminada: !hayAlguna },
    select: { id: true },
  });

  revalidatePath("/admin/comisiones/escalas");
  redirect(`/admin/comisiones/escalas/${escala.id}`);
}

export async function renombrarEscala(
  _previo: EstadoTramo,
  formData: FormData
): Promise<EstadoTramo> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const parsed = nombreEscalaSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errores: z.flattenError(parsed.error).fieldErrors };

  const { count } = await db.escala.updateMany({
    where: { id },
    data: { nombre: parsed.data.nombre },
  });
  if (count === 0) return { error: "No se encontró la escala." };

  revalidatePath("/admin/comisiones/escalas");
  revalidatePath(`/admin/comisiones/escalas/${id}`);
  return { ok: true };
}

export type ResultadoEscala = { ok?: boolean; error?: string };

/** Pasa a ser la escala que se le aplica a un vendedor sin escala propia. */
export async function marcarPredeterminada(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");

  await db.$transaction([
    db.escala.updateMany({ where: { esPredeterminada: true }, data: { esPredeterminada: false } }),
    db.escala.update({ where: { id }, data: { esPredeterminada: true } }),
  ]);

  revalidatePath("/admin/comisiones/escalas");
  revalidatePath("/admin/comisiones");
}

/**
 * Borra la escala entera, con sus tramos. No se puede borrar la predeterminada
 * (siempre tiene que haber una) ni una que algun vendedor tenga asignada: eso
 * lo dejaria sin escala de un momento a otro.
 */
export async function eliminarEscala(formData: FormData): Promise<ResultadoEscala> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");

  const escala = await db.escala.findUnique({
    where: { id },
    select: { esPredeterminada: true, _count: { select: { vendedores: true } } },
  });
  if (!escala) return { error: "No se encontró la escala." };
  if (escala.esPredeterminada) {
    return { error: "No se puede eliminar la escala predeterminada." };
  }
  if (escala._count.vendedores > 0) {
    return {
      error: `Hay ${escala._count.vendedores} vendedor(es) con esta escala asignada. Cambialos de escala antes de borrarla.`,
    };
  }

  await db.escala.delete({ where: { id } });

  revalidatePath("/admin/comisiones/escalas");
  return { ok: true };
}
