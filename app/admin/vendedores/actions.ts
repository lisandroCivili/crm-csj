"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { esDuplicado, erroresPorDuplicado } from "@/lib/errores-prisma";
import { requireAdmin, requireZonaActivaId } from "@/lib/sesion";
import { passwordNueva } from "@/lib/validations/comunes";
import { usuarioVendedorSchema, vendedorSchema } from "@/lib/validations/vendedor";

export type EstadoFormulario = {
  /** true solo despues de un envio que salio bien. */
  ok?: boolean;
  error?: string;
  errores?: Record<string, string[] | undefined>;
};

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

  // El filtro por zona evita editar un vendedor de la otra zona por id.
  const actual = await db.vendedor.findFirst({
    where: { id, zonaId },
    select: { userId: true },
  });
  if (!actual) return { error: "No se encontró el vendedor en esta zona." };

  try {
    await db.$transaction([
      db.vendedor.update({ where: { id }, data: parsed.data }),
      // El nombre de la cuenta sale del nombre del vendedor: si se corrige acá
      // y no allá, el sistema lo saluda con un nombre y lo lista con otro.
      ...(actual.userId
        ? [
            db.user.update({
              where: { id: actual.userId },
              data: { nombre: parsed.data.nombreCompleto },
            }),
          ]
        : []),
    ]);
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

// ---------------------------------------------------------------------------
// Cuenta y permisos del vendedor
//
// Todas estas acciones llegan al `User` a traves del `Vendedor`, y el vendedor
// se busca siempre con la zona activa: sin ese filtro, un id copiado a mano
// dejaria tocar la cuenta de alguien de la otra zona.
//
// Ademas se verifica que la cuenta sea de rol VENDEDOR. Balta y Pedro son
// agentes, asi que un `User` ADMIN puede estar enlazado a un `Vendedor`; desde
// esta pantalla no se toca jamas una cuenta de administracion.
// ---------------------------------------------------------------------------

export type ResultadoAccion = { ok?: boolean; error?: string };

const PERMISOS = ["puedeVerLeads", "puedeCargarVentas", "puedeVerComision"] as const;
const permisoSchema = z.enum(PERMISOS);

type CuentaDelVendedor = { userId: string } | { error: string };

async function cuentaDelVendedor(id: string, zonaId: number): Promise<CuentaDelVendedor> {
  const vendedor = await db.vendedor.findFirst({
    where: { id, zonaId },
    select: { userId: true, user: { select: { id: true, role: true } } },
  });

  if (!vendedor) return { error: "No se encontró el vendedor en esta zona." };
  if (!vendedor.userId || !vendedor.user) {
    return { error: "Este vendedor todavía no tiene cuenta de ingreso." };
  }
  if (vendedor.user.role !== "VENDEDOR") {
    return { error: "Esa cuenta no es de un vendedor." };
  }

  return { userId: vendedor.userId };
}

/** Enciende o apaga una seccion para el vendedor. Se guarda al instante. */
export async function cambiarPermisoVendedor(datos: {
  vendedorId: string;
  permiso: string;
  valor: boolean;
}): Promise<ResultadoAccion> {
  await requireAdmin();
  const zonaId = await requireZonaActivaId();

  // La clave viene del cliente: nunca se interpola sin validar contra la lista.
  const permiso = permisoSchema.safeParse(datos.permiso);
  if (!permiso.success) return { error: "Ese permiso no existe." };

  const { count } = await db.vendedor.updateMany({
    where: { id: datos.vendedorId, zonaId },
    data: { [permiso.data]: datos.valor },
  });
  if (count === 0) return { error: "No se encontró el vendedor en esta zona." };

  revalidatePath(`/admin/vendedores/${datos.vendedorId}`);
  return { ok: true };
}

/**
 * Contrasena nueva para el vendedor que perdio la suya. La escribe el admin y
 * se la pasa por su cuenta: el sistema no manda mails.
 */
export async function resetearPasswordVendedor(
  _previo: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  await requireAdmin();
  const zonaId = await requireZonaActivaId();

  const id = String(formData.get("vendedorId") ?? "");
  const parsed = z
    .object({ password: passwordNueva })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errores: z.flattenError(parsed.error).fieldErrors };

  const cuenta = await cuentaDelVendedor(id, zonaId);
  if ("error" in cuenta) return { error: cuenta.error };

  await db.user.update({
    where: { id: cuenta.userId },
    data: { passwordHash: await bcrypt.hash(parsed.data.password, 10) },
  });

  revalidatePath(`/admin/vendedores/${id}`);
  return { ok: true };
}

/** Cambia el email con el que entra el vendedor. */
export async function cambiarEmailVendedor(
  _previo: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  await requireAdmin();
  const zonaId = await requireZonaActivaId();

  const id = String(formData.get("vendedorId") ?? "");
  const parsed = z
    .object({ email: z.string().trim().toLowerCase().email("El email no es válido.") })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errores: z.flattenError(parsed.error).fieldErrors };

  const cuenta = await cuentaDelVendedor(id, zonaId);
  if ("error" in cuenta) return { error: cuenta.error };

  try {
    await db.user.update({ where: { id: cuenta.userId }, data: { email: parsed.data.email } });
  } catch (error) {
    if (esDuplicado(error)) {
      return { errores: { email: ["Ya hay una cuenta con ese email."] } };
    }
    throw error;
  }

  revalidatePath(`/admin/vendedores/${id}`);
  return { ok: true };
}

/**
 * Habilita o suspende el ingreso al sistema. Es distinto de dar de baja al
 * vendedor: esto le saca el acceso, aquello lo saca del equipo.
 */
export async function cambiarEstadoCuentaVendedor(formData: FormData) {
  await requireAdmin();
  const zonaId = await requireZonaActivaId();

  const id = String(formData.get("vendedorId") ?? "");
  const activo = formData.get("activo") === "true";

  const cuenta = await cuentaDelVendedor(id, zonaId);
  if ("error" in cuenta) return;

  await db.user.update({ where: { id: cuenta.userId }, data: { activo } });

  revalidatePath("/admin/vendedores");
  revalidatePath(`/admin/vendedores/${id}`);
}
