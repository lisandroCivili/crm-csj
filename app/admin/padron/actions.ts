"use server";

import { revalidatePath } from "next/cache";
import { borrarTemporal, guardarTemporal, leerTemporal } from "@/lib/archivos";
import { db } from "@/lib/db";
import { parsePadron, type ErrorFila } from "@/lib/excel/parsePadron";
import { importarPadron, type ResumenImportacion } from "@/lib/padron/importarPadron";
import { requireAdmin, requireZonaActivaId } from "@/lib/sesion";

const EXTENSIONES = [".xls", ".xlsx"];
const TAMANIO_MAXIMO = 25 * 1024 * 1024;

export type EstadoImportacion =
  | { paso: "inicial"; error?: string }
  | {
      paso: "preview";
      token: string;
      archivoNombre: string;
      resumen: ResumenImportacion;
      errores: ErrorFila[];
      periodos: string[];
      error?: string;
    }
  | { paso: "importado"; resumen: ResumenImportacion; archivoNombre: string };

function periodosDe(fechas: Date[]): string[] {
  const meses = new Set(fechas.map((f) => f.toISOString().slice(0, 7)));
  return [...meses].sort();
}

/**
 * Paso 1: se sube el archivo, se parsea y se devuelve el preview. No escribe
 * nada en la base: solo calcula que pasaria.
 */
export async function analizarPadron(
  _previo: EstadoImportacion,
  formData: FormData
): Promise<EstadoImportacion> {
  await requireAdmin();
  const zonaId = await requireZonaActivaId();

  const archivo = formData.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0) {
    return { paso: "inicial", error: "Elegí un archivo." };
  }
  if (!EXTENSIONES.some((ext) => archivo.name.toLowerCase().endsWith(ext))) {
    return { paso: "inicial", error: "El archivo tiene que ser .xls o .xlsx." };
  }
  if (archivo.size > TAMANIO_MAXIMO) {
    return { paso: "inicial", error: "El archivo supera los 25 MB." };
  }

  const contenido = Buffer.from(await archivo.arrayBuffer());

  let parseo;
  try {
    parseo = parsePadron(contenido);
  } catch (error) {
    return {
      paso: "inicial",
      error: error instanceof Error ? error.message : "No se pudo leer el archivo.",
    };
  }

  if (parseo.filas.length === 0) {
    return { paso: "inicial", error: "El archivo no tiene ninguna fila válida." };
  }

  const resumen = await importarPadron({
    filas: parseo.filas,
    zonaId,
    soloSimular: true,
  });

  const token = await guardarTemporal(contenido, archivo.name);

  return {
    paso: "preview",
    token,
    archivoNombre: archivo.name,
    resumen,
    errores: parseo.errores.slice(0, 20),
    periodos: periodosDe(parseo.filas.map((f) => f.emision)),
  };
}

/**
 * Paso 2: vincula los NomVen pendientes con vendedores ya cargados y, si no
 * queda ninguno sin vincular y el admin confirmo, aplica la importacion.
 */
export async function procesarPadron(
  previo: EstadoImportacion,
  formData: FormData
): Promise<EstadoImportacion> {
  const usuario = await requireAdmin();
  const zonaId = await requireZonaActivaId();

  const token = String(formData.get("token") ?? "");
  if (!token) return { paso: "inicial", error: "Se perdió el archivo. Subilo de nuevo." };

  let archivo;
  try {
    archivo = await leerTemporal(token);
  } catch {
    return { paso: "inicial", error: "El archivo ya no está disponible. Subilo de nuevo." };
  }

  // Vinculaciones elegidas en el formulario: name="vinculo:<NOMVEN>".
  const vinculos: { nomVenPadron: string; vendedorId: string }[] = [];
  for (const [clave, valor] of formData.entries()) {
    if (!clave.startsWith("vinculo:") || typeof valor !== "string" || !valor) continue;
    vinculos.push({ nomVenPadron: clave.slice("vinculo:".length), vendedorId: valor });
  }

  if (vinculos.length > 0) {
    const idsValidos = new Set(
      (
        await db.vendedor.findMany({
          where: { zonaId, id: { in: vinculos.map((v) => v.vendedorId) } },
          select: { id: true },
        })
      ).map((v) => v.id)
    );

    await db.vendedorAlias.createMany({
      data: vinculos.filter((v) => idsValidos.has(v.vendedorId)),
      skipDuplicates: true,
    });
  }

  const parseo = parsePadron(archivo.contenido);
  const periodos = periodosDe(parseo.filas.map((f) => f.emision));
  const quiereConfirmar = formData.get("confirmar") === "1";

  const simulacion = await importarPadron({
    filas: parseo.filas,
    zonaId,
    soloSimular: true,
  });

  const preview: EstadoImportacion = {
    paso: "preview",
    token,
    archivoNombre: archivo.nombreOriginal,
    resumen: simulacion,
    errores: parseo.errores.slice(0, 20),
    periodos,
  };

  if (!quiereConfirmar) return preview;

  if (simulacion.nomVenSinMapear.length > 0) {
    return {
      ...preview,
      error: "Todavía quedan vendedores sin vincular.",
    } as EstadoImportacion;
  }

  const resumen = await importarPadron({
    filas: parseo.filas,
    zonaId,
    soloSimular: false,
    lote: {
      archivoNombre: archivo.nombreOriginal,
      importadoPorUserId: usuario.id,
      periodoDesde: parseo.periodoDesde,
      periodoHasta: parseo.periodoHasta,
    },
  });

  await borrarTemporal(token);

  revalidatePath("/admin/padron");
  revalidatePath("/admin/clientes");
  revalidatePath("/admin/dashboard");

  return { paso: "importado", resumen, archivoNombre: archivo.nombreOriginal };
}

/**
 * Un unico punto de entrada para el formulario: useActionState maneja una sola
 * accion, y el paso lo decide el campo oculto `accion`.
 */
export async function pasoImportacion(
  previo: EstadoImportacion,
  formData: FormData
): Promise<EstadoImportacion> {
  return String(formData.get("accion")) === "procesar"
    ? procesarPadron(previo, formData)
    : analizarPadron(previo, formData);
}

export async function descartarPadron(formData: FormData) {
  await requireAdmin();
  const token = String(formData.get("token") ?? "");
  if (token) await borrarTemporal(token);
}
