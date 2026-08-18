"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { borrarTemporal, guardarTemporal, leerTemporal } from "@/lib/archivos";
import { db } from "@/lib/db";
import { parseLeads, claveTelefono, type CampoLead, type ErrorFilaLead } from "@/lib/excel/parseLeads";
import { requireAdmin, requireUsuario, requireZonaActivaId } from "@/lib/sesion";
import { cambioEstadoSchema } from "@/lib/validations/lead";

const EXTENSIONES = [".xls", ".xlsx", ".csv"];
const TAMANIO_MAXIMO = 25 * 1024 * 1024;

export type ResumenLeads = {
  filasLeidas: number;
  aImportar: number;
  duplicadosEnArchivo: number;
  yaExistentes: number;
};

export type EstadoImportacionLeads =
  | { paso: "inicial"; error?: string }
  | {
      paso: "preview";
      token: string;
      archivoNombre: string;
      origen: "CLUB" | "PROPIO";
      resumen: ResumenLeads;
      columnasDetectadas: Record<CampoLead, string | null>;
      columnasIgnoradas: string[];
      errores: ErrorFilaLead[];
      muestra: { nombre: string; telefono: string | null; localidad: string | null }[];
      error?: string;
    }
  | { paso: "importado"; resumen: ResumenLeads; archivoNombre: string };

/**
 * Los exports de Meta suelen solaparse entre campanias y entre descargas, asi
 * que se descartan los repetidos por telefono. La comparacion usa
 * `claveTelefono` y no el texto crudo, porque el mismo numero llega escrito de
 * varias formas segun como lo haya tipeado la persona.
 */
async function analizarArchivo(contenido: Buffer, zonaId: number) {
  const parseo = parseLeads(contenido);

  const vistos = new Set<string>();
  const sinRepetirEnArchivo: typeof parseo.filas = [];
  let duplicadosEnArchivo = 0;

  for (const fila of parseo.filas) {
    const clave = claveTelefono(fila.telefono);
    if (clave && vistos.has(clave)) {
      duplicadosEnArchivo++;
      continue;
    }
    if (clave) vistos.add(clave);
    sinRepetirEnArchivo.push(fila);
  }

  const existentes = await db.lead.findMany({
    where: { zonaId, telefono: { not: null } },
    select: { telefono: true },
  });
  const telefonosEnBase = new Set(existentes.map((lead) => claveTelefono(lead.telefono)));

  const aImportar = sinRepetirEnArchivo.filter((fila) => {
    const clave = claveTelefono(fila.telefono);
    return !clave || !telefonosEnBase.has(clave);
  });

  return {
    parseo,
    aImportar,
    resumen: {
      filasLeidas: parseo.filas.length,
      aImportar: aImportar.length,
      duplicadosEnArchivo,
      yaExistentes: sinRepetirEnArchivo.length - aImportar.length,
    } satisfies ResumenLeads,
  };
}

export async function analizarLeads(
  _previo: EstadoImportacionLeads,
  formData: FormData
): Promise<EstadoImportacionLeads> {
  await requireAdmin();
  const zonaId = await requireZonaActivaId();

  const archivo = formData.get("archivo");
  const origen = formData.get("origen") === "CLUB" ? "CLUB" : "PROPIO";

  if (!(archivo instanceof File) || archivo.size === 0) {
    return { paso: "inicial", error: "Elegí un archivo." };
  }
  if (!EXTENSIONES.some((ext) => archivo.name.toLowerCase().endsWith(ext))) {
    return { paso: "inicial", error: "El archivo tiene que ser .xls, .xlsx o .csv." };
  }
  if (archivo.size > TAMANIO_MAXIMO) {
    return { paso: "inicial", error: "El archivo supera los 25 MB." };
  }

  const contenido = Buffer.from(await archivo.arrayBuffer());

  let analisis;
  try {
    analisis = await analizarArchivo(contenido, zonaId);
  } catch (error) {
    return {
      paso: "inicial",
      error: error instanceof Error ? error.message : "No se pudo leer el archivo.",
    };
  }

  if (analisis.parseo.filas.length === 0) {
    return { paso: "inicial", error: "El archivo no tiene ninguna fila válida." };
  }

  const token = await guardarTemporal(contenido, archivo.name);

  return {
    paso: "preview",
    token,
    archivoNombre: archivo.name,
    origen,
    resumen: analisis.resumen,
    columnasDetectadas: analisis.parseo.columnasDetectadas,
    columnasIgnoradas: analisis.parseo.columnasIgnoradas,
    errores: analisis.parseo.errores.slice(0, 10),
    muestra: analisis.aImportar.slice(0, 5).map((fila) => ({
      nombre: fila.nombre,
      telefono: fila.telefono,
      localidad: fila.localidad,
    })),
  };
}

export async function confirmarLeads(
  previo: EstadoImportacionLeads,
  formData: FormData
): Promise<EstadoImportacionLeads> {
  const usuario = await requireAdmin();
  const zonaId = await requireZonaActivaId();

  const token = String(formData.get("token") ?? "");
  const origen = formData.get("origen") === "CLUB" ? "CLUB" : "PROPIO";
  if (!token) return { paso: "inicial", error: "Se perdió el archivo. Subilo de nuevo." };

  let archivo;
  try {
    archivo = await leerTemporal(token);
  } catch {
    return { paso: "inicial", error: "El archivo ya no está disponible. Subilo de nuevo." };
  }

  const { aImportar, resumen } = await analizarArchivo(archivo.contenido, zonaId);

  if (aImportar.length === 0) {
    return { ...(previo as object), error: "No hay leads nuevos para importar." } as EstadoImportacionLeads;
  }

  await db.$transaction(async (tx) => {
    const lote = await tx.leadImport.create({
      data: {
        archivoNombre: archivo.nombreOriginal,
        origen,
        zonaId,
        cantidad: aImportar.length,
        importadoPorUserId: usuario.id,
      },
      select: { id: true },
    });

    await tx.lead.createMany({
      data: aImportar.map((fila) => ({
        nombre: fila.nombre,
        telefono: fila.telefono,
        direccion: fila.direccion,
        localidad: fila.localidad,
        provincia: fila.provincia,
        origen,
        zonaId,
        leadImportId: lote.id,
      })),
    });
  });

  await borrarTemporal(token);

  revalidatePath("/admin/leads");
  revalidatePath("/admin/dashboard");

  return { paso: "importado", resumen, archivoNombre: archivo.nombreOriginal };
}

export async function pasoImportacionLeads(
  previo: EstadoImportacionLeads,
  formData: FormData
): Promise<EstadoImportacionLeads> {
  return String(formData.get("accion")) === "confirmar"
    ? confirmarLeads(previo, formData)
    : analizarLeads(previo, formData);
}

/** Asignacion masiva: el admin selecciona leads de la tabla y elige vendedor. */
export async function asignarLeads(formData: FormData) {
  const usuario = await requireAdmin();
  const zonaId = await requireZonaActivaId();

  const vendedorId = String(formData.get("vendedorId") ?? "");
  const ids = formData.getAll("leadId").map(String).filter(Boolean);
  if (ids.length === 0 || !vendedorId) return;

  const vendedor = await db.vendedor.findFirst({
    where: { id: vendedorId, zonaId, activo: true },
    select: { id: true, nombreCompleto: true },
  });
  if (!vendedor) return;

  const leads = await db.lead.findMany({
    where: { id: { in: ids }, zonaId },
    select: { id: true },
  });

  await db.$transaction([
    db.lead.updateMany({
      where: { id: { in: leads.map((l) => l.id) } },
      data: { vendedorAsignadoId: vendedor.id, fechaAsignacion: new Date() },
    }),
    db.leadActividad.createMany({
      data: leads.map((lead) => ({
        leadId: lead.id,
        tipo: "ASIGNACION" as const,
        detalle: `Asignado a ${vendedor.nombreCompleto}`,
        actorUserId: usuario.id,
      })),
    }),
  ]);

  revalidatePath("/admin/leads");
  revalidatePath("/admin/actividad");
}

export type EstadoCambio = { error?: string; ok?: boolean };

/**
 * Cambio de estado del lead. La usan tanto el vendedor como el admin, y siempre
 * deja registro: el admin tiene que poder ver todo lo que hacen los vendedores.
 */
export async function cambiarEstadoLead(
  _previo: EstadoCambio,
  formData: FormData
): Promise<EstadoCambio> {
  // Pasa por el helper como todo el resto: lee el estado de la cuenta y los
  // permisos de la base, no del token.
  const usuario = await requireUsuario();

  if (usuario.role === "VENDEDOR" && !usuario.permisos.verLeads) {
    return { error: "No tenés acceso a los leads." };
  }

  const parsed = cambioEstadoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: z.flattenError(parsed.error).fieldErrors.motivoDevolucion?.[0] ?? "Datos inválidos." };
  }

  const { leadId, estado, motivoDevolucion } = parsed.data;

  // Un vendedor solo toca sus propios leads; el admin, los de su zona activa.
  const alcance =
    usuario.role === "VENDEDOR"
      ? { id: leadId, vendedorAsignadoId: usuario.vendedorId ?? "" }
      : { id: leadId, zonaId: (await requireZonaActivaId()) };

  const lead = await db.lead.findFirst({
    where: alcance,
    select: { id: true, estado: true },
  });
  if (!lead) return { error: "No se encontró el lead." };
  if (lead.estado === estado && !motivoDevolucion) return { ok: true };

  await db.$transaction([
    db.lead.update({
      where: { id: lead.id },
      data: {
        estado,
        motivoDevolucion: estado === "DEVOLUCION" ? motivoDevolucion : null,
        // Devolver el lead lo libera para que el admin lo reasigne.
        ...(estado === "DEVOLUCION" ? { vendedorAsignadoId: null, fechaAsignacion: null } : {}),
      },
    }),
    db.leadActividad.create({
      data: {
        leadId: lead.id,
        tipo: "CAMBIO_ESTADO",
        estadoAnterior: lead.estado,
        estadoNuevo: estado,
        detalle: motivoDevolucion,
        actorUserId: usuario.id,
      },
    }),
  ]);

  revalidatePath("/admin/leads");
  revalidatePath("/admin/actividad");
  revalidatePath("/vendedor/leads");
  revalidatePath(`/vendedor/leads/${lead.id}`);

  return { ok: true };
}
