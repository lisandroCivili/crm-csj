"use server";

import { revalidatePath } from "next/cache";
import { borrarTemporal, guardarTemporal, leerTemporal } from "@/lib/archivos";
import { db } from "@/lib/db";
import { parsePrecios, type ErrorFilaPrecio } from "@/lib/excel/parsePrecios";
import { requireAdmin } from "@/lib/sesion";

const EXTENSIONES = [".xls", ".xlsx", ".csv"];

export type ResumenPrecios = {
  filasLeidas: number;
  planesNuevos: number;
  preciosNuevos: number;
  sinCambios: number;
};

export type EstadoPrecios =
  | { paso: "inicial"; error?: string }
  | {
      paso: "preview";
      token: string;
      archivoNombre: string;
      resumen: ResumenPrecios;
      columnasDetectadas: Record<string, string | null>;
      errores: ErrorFilaPrecio[];
      muestra: { codigoProducto: string; nombre: string; precio: number; nuevo: boolean }[];
      error?: string;
    }
  | { paso: "importado"; resumen: ResumenPrecios };

/**
 * El precio no se pisa: cada carga agrega una fila nueva con su fecha de
 * vigencia. Asi una venta hecha el mes pasado conserva el precio con el que se
 * vendio, en vez de quedar reescrita por la lista nueva.
 */
async function analizar(contenido: Buffer, vigenteDesde: Date) {
  const parseo = parsePrecios(contenido);

  const codigos = [...new Set(parseo.filas.map((f) => f.codigoProducto))];
  const existentes = await db.plan.findMany({
    where: { codigoProducto: { in: codigos } },
    select: {
      id: true,
      codigoProducto: true,
      precios: { orderBy: { vigenteDesde: "desc" }, take: 1, select: { precio: true } },
    },
  });
  const porCodigo = new Map(existentes.map((p) => [p.codigoProducto, p]));

  let planesNuevos = 0;
  let preciosNuevos = 0;
  let sinCambios = 0;

  const detalle = parseo.filas.map((fila) => {
    const plan = porCodigo.get(fila.codigoProducto);
    const nuevo = !plan;
    if (nuevo) planesNuevos++;

    const precioActual = plan?.precios[0] ? Number(plan.precios[0].precio) : null;
    const cambio = precioActual === null || precioActual !== fila.precio;

    if (cambio) preciosNuevos++;
    else sinCambios++;

    return { fila, nuevo, cambio };
  });

  return {
    parseo,
    detalle,
    vigenteDesde,
    resumen: {
      filasLeidas: parseo.filas.length,
      planesNuevos,
      preciosNuevos,
      sinCambios,
    } satisfies ResumenPrecios,
  };
}

/** Primer dia del mes en curso: la lista rige desde que empieza el mes. */
function vigenciaPorDefecto(): Date {
  const ahora = new Date();
  return new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), 1));
}

export async function pasoImportacionPrecios(
  previo: EstadoPrecios,
  formData: FormData
): Promise<EstadoPrecios> {
  await requireAdmin();

  const confirmar = String(formData.get("accion")) === "confirmar";

  // --- Analisis -----------------------------------------------------------
  if (!confirmar) {
    const archivo = formData.get("archivo");
    if (!(archivo instanceof File) || archivo.size === 0) {
      return { paso: "inicial", error: "Elegí un archivo." };
    }
    if (!EXTENSIONES.some((ext) => archivo.name.toLowerCase().endsWith(ext))) {
      return { paso: "inicial", error: "El archivo tiene que ser .xls, .xlsx o .csv." };
    }

    const contenido = Buffer.from(await archivo.arrayBuffer());

    let analisis;
    try {
      analisis = await analizar(contenido, vigenciaPorDefecto());
    } catch (error) {
      return {
        paso: "inicial",
        error: error instanceof Error ? error.message : "No se pudo leer el archivo.",
      };
    }

    if (analisis.parseo.filas.length === 0) {
      return { paso: "inicial", error: "El archivo no tiene ninguna fila válida." };
    }

    return {
      paso: "preview",
      token: await guardarTemporal(contenido, archivo.name),
      archivoNombre: archivo.name,
      resumen: analisis.resumen,
      columnasDetectadas: analisis.parseo.columnasDetectadas,
      errores: analisis.parseo.errores.slice(0, 10),
      muestra: analisis.detalle.slice(0, 8).map(({ fila, nuevo }) => ({
        codigoProducto: fila.codigoProducto,
        nombre: fila.nombre,
        precio: fila.precio,
        nuevo,
      })),
    };
  }

  // --- Confirmacion -------------------------------------------------------
  const token = String(formData.get("token") ?? "");
  if (!token) return { paso: "inicial", error: "Se perdió el archivo. Subilo de nuevo." };

  let archivo;
  try {
    archivo = await leerTemporal(token);
  } catch {
    return { paso: "inicial", error: "El archivo ya no está disponible. Subilo de nuevo." };
  }

  const { detalle, resumen, vigenteDesde } = await analizar(
    archivo.contenido,
    vigenciaPorDefecto()
  );

  await db.$transaction(async (tx) => {
    for (const { fila, cambio } of detalle) {
      const plan = await tx.plan.upsert({
        where: { codigoProducto: fila.codigoProducto },
        update: {
          nombre: fila.nombre,
          ...(fila.duracionMeses ? { duracionMeses: fila.duracionMeses } : {}),
          activo: true,
        },
        create: {
          codigoProducto: fila.codigoProducto,
          nombre: fila.nombre,
          duracionMeses: fila.duracionMeses,
        },
        select: { id: true },
      });

      if (!cambio) continue;

      // Si ya se cargo una lista este mes, se corrige esa misma vigencia en
      // vez de acumular dos precios para la misma fecha.
      await tx.planPrecio.upsert({
        where: { planId_vigenteDesde: { planId: plan.id, vigenteDesde } },
        update: { precio: fila.precio },
        create: { planId: plan.id, precio: fila.precio, vigenteDesde },
      });
    }
  });

  await borrarTemporal(token);
  revalidatePath("/admin/planes");

  return { paso: "importado", resumen };
}
