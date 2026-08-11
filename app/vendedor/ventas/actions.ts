"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  TAMANIO_MAXIMO_ADJUNTO,
  TIPOS_ADJUNTO_PERMITIDOS,
  borrarAdjunto,
  guardarAdjunto,
} from "@/lib/archivos";
import { db } from "@/lib/db";
import { requireVendedor } from "@/lib/sesion";
import { CAMPOS_HISTORIAL, ventaSchema } from "@/lib/validations/venta";
import type { AdjuntoTipo } from "@/lib/generated/prisma/client";

export type EstadoVenta = {
  error?: string;
  errores?: Record<string, string[] | undefined>;
};

type ArchivoValidado = { contenido: Buffer; mimeType: string; size: number };

/** Valida tipo y tamanio antes de tocar el disco. */
async function validarArchivo(
  valor: FormDataEntryValue | null,
  etiqueta: string
): Promise<{ archivo: ArchivoValidado | null; error?: string }> {
  if (!(valor instanceof File) || valor.size === 0) return { archivo: null };

  if (!TIPOS_ADJUNTO_PERMITIDOS.includes(valor.type as (typeof TIPOS_ADJUNTO_PERMITIDOS)[number])) {
    return { archivo: null, error: `${etiqueta}: tiene que ser una imagen (JPG, PNG, WEBP) o un PDF.` };
  }
  if (valor.size > TAMANIO_MAXIMO_ADJUNTO) {
    return { archivo: null, error: `${etiqueta}: no puede superar los 10 MB.` };
  }

  return {
    archivo: {
      contenido: Buffer.from(await valor.arrayBuffer()),
      mimeType: valor.type,
      size: valor.size,
    },
  };
}

export async function crearVenta(
  _previo: EstadoVenta,
  formData: FormData
): Promise<EstadoVenta> {
  const usuario = await requireVendedor();

  const parsed = ventaSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { errores: z.flattenError(parsed.error).fieldErrors };
  }

  const dni = await validarArchivo(formData.get("adjuntoDni"), "Foto del DNI");
  if (dni.error) return { error: dni.error };
  // La foto del DNI es obligatoria para dar de alta la venta.
  if (!dni.archivo) return { errores: { adjuntoDni: ["Adjuntá la foto del DNI."] } };

  const contrato = await validarArchivo(formData.get("adjuntoContrato"), "Contrato");
  if (contrato.error) return { error: contrato.error };

  const vendedor = await db.vendedor.findUniqueOrThrow({
    where: { id: usuario.vendedorId },
    select: { zonaId: true },
  });

  const plan = await db.plan.findFirst({
    where: { id: parsed.data.planId, activo: true },
    select: { id: true, codigoProducto: true },
  });
  if (!plan) return { errores: { planId: ["Ese plan ya no está disponible."] } };

  const leadId = String(formData.get("leadId") ?? "") || null;

  // Los archivos se escriben antes que la venta porque el disco no participa de
  // la transaccion; si despues falla la base, se borran a mano.
  const rutas: string[] = [];
  let ventaId: string;

  try {
    const rutaDni = await guardarAdjunto(dni.archivo.contenido, dni.archivo.mimeType);
    rutas.push(rutaDni);

    const rutaContrato = contrato.archivo
      ? await guardarAdjunto(contrato.archivo.contenido, contrato.archivo.mimeType)
      : null;
    if (rutaContrato) rutas.push(rutaContrato);

    const venta = await db.$transaction(async (tx) => {
      const creada = await tx.venta.create({
        data: {
          vendedorId: usuario.vendedorId,
          zonaId: vendedor.zonaId,
          nombreCliente: parsed.data.nombreCliente,
          dni: parsed.data.dni,
          telefono: parsed.data.telefono,
          direccion: parsed.data.direccion,
          localidad: parsed.data.localidad,
          provincia: parsed.data.provincia,
          planId: plan.id,
          codigoProducto: plan.codigoProducto,
          debitoAutomatico: parsed.data.debitoAutomatico,
          ...(leadId ? { leadId } : {}),
        },
        select: { id: true },
      });

      await tx.ventaAdjunto.create({
        data: {
          ventaId: creada.id,
          tipo: "DNI",
          path: rutaDni,
          mimeType: dni.archivo!.mimeType,
          size: dni.archivo!.size,
          subidoPorUserId: usuario.id,
        },
      });

      if (rutaContrato && contrato.archivo) {
        await tx.ventaAdjunto.create({
          data: {
            ventaId: creada.id,
            tipo: "CONTRATO",
            path: rutaContrato,
            mimeType: contrato.archivo.mimeType,
            size: contrato.archivo.size,
            subidoPorUserId: usuario.id,
          },
        });
      }

      // Si la venta salio de un lead, el lead queda marcado como vendido.
      if (leadId) {
        const lead = await tx.lead.findFirst({
          where: { id: leadId, vendedorAsignadoId: usuario.vendedorId },
          select: { id: true, estado: true },
        });
        if (lead && lead.estado !== "VENDIDO") {
          await tx.lead.update({ where: { id: lead.id }, data: { estado: "VENDIDO" } });
          await tx.leadActividad.create({
            data: {
              leadId: lead.id,
              tipo: "CAMBIO_ESTADO",
              estadoAnterior: lead.estado,
              estadoNuevo: "VENDIDO",
              detalle: "Se cargó la venta",
              actorUserId: usuario.id,
            },
          });
        }
      }

      return creada;
    });

    ventaId = venta.id;
  } catch (error) {
    // Si la base fallo, los archivos ya escritos quedarian huerfanos.
    await Promise.all(rutas.map(borrarAdjunto));
    throw error;
  }

  revalidatePath("/vendedor/ventas");
  revalidatePath("/admin/ventas");
  // Fuera del try: redirect() se implementa lanzando, y adentro se confundiria
  // con un fallo y borraria los adjuntos recien guardados.
  redirect(`/vendedor/ventas/${ventaId}`);
}

export async function editarVenta(
  _previo: EstadoVenta,
  formData: FormData
): Promise<EstadoVenta> {
  const usuario = await requireVendedor();
  const id = String(formData.get("id") ?? "");

  const parsed = ventaSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { errores: z.flattenError(parsed.error).fieldErrors };
  }

  const venta = await db.venta.findFirst({
    where: { id, vendedorId: usuario.vendedorId },
  });
  if (!venta) return { error: "No se encontró la venta." };

  const plan = await db.plan.findFirst({
    where: { id: parsed.data.planId },
    select: { id: true, codigoProducto: true, nombre: true },
  });
  if (!plan) return { errores: { planId: ["Ese plan ya no está disponible."] } };

  const nuevos: Record<string, unknown> = {
    nombreCliente: parsed.data.nombreCliente,
    dni: parsed.data.dni,
    telefono: parsed.data.telefono,
    direccion: parsed.data.direccion,
    localidad: parsed.data.localidad,
    provincia: parsed.data.provincia,
    planId: plan.id,
    codigoProducto: plan.codigoProducto,
    debitoAutomatico: parsed.data.debitoAutomatico,
  };

  // Se guarda el diff campo por campo, no la fila entera: el historial tiene
  // que dejar ver que cambio exactamente y contra que valor. Los valores se
  // normalizan a tipos JSON simples porque la columna es Json.
  type ValorHistorial = string | number | boolean | null;
  const aValor = (valor: unknown): ValorHistorial =>
    valor === null || valor === undefined
      ? null
      : typeof valor === "string" || typeof valor === "number" || typeof valor === "boolean"
        ? valor
        : String(valor);

  const cambios: Record<string, { antes: ValorHistorial; despues: ValorHistorial }> = {};
  for (const campo of CAMPOS_HISTORIAL) {
    const antes = aValor((venta as Record<string, unknown>)[campo]);
    const despues = aValor(nuevos[campo]);
    if (antes !== despues) cambios[campo] = { antes, despues };
  }

  const contrato = await validarArchivo(formData.get("adjuntoContrato"), "Contrato");
  if (contrato.error) return { error: contrato.error };

  const dni = await validarArchivo(formData.get("adjuntoDni"), "Foto del DNI");
  if (dni.error) return { error: dni.error };

  const nuevosAdjuntos: { tipo: AdjuntoTipo; archivo: ArchivoValidado }[] = [];
  if (dni.archivo) nuevosAdjuntos.push({ tipo: "DNI", archivo: dni.archivo });
  if (contrato.archivo) nuevosAdjuntos.push({ tipo: "CONTRATO", archivo: contrato.archivo });

  if (Object.keys(cambios).length === 0 && nuevosAdjuntos.length === 0) {
    redirect(`/vendedor/ventas/${venta.id}`);
  }

  const rutas: string[] = [];
  try {
    const guardados = await Promise.all(
      nuevosAdjuntos.map(async ({ tipo, archivo }) => {
        const path = await guardarAdjunto(archivo.contenido, archivo.mimeType);
        rutas.push(path);
        return { tipo, path, mimeType: archivo.mimeType, size: archivo.size };
      })
    );

    await db.$transaction(async (tx) => {
      if (Object.keys(cambios).length > 0) {
        await tx.venta.update({ where: { id: venta.id }, data: nuevos });
        await tx.ventaHistorial.create({
          data: { ventaId: venta.id, cambios, modificadoPorUserId: usuario.id },
        });
      }

      for (const adjunto of guardados) {
        await tx.ventaAdjunto.create({
          data: { ...adjunto, ventaId: venta.id, subidoPorUserId: usuario.id },
        });
      }
    });
  } catch (error) {
    await Promise.all(rutas.map(borrarAdjunto));
    throw error;
  }

  revalidatePath("/vendedor/ventas");
  revalidatePath(`/vendedor/ventas/${venta.id}`);
  revalidatePath("/admin/ventas");
  redirect(`/vendedor/ventas/${venta.id}`);
}
