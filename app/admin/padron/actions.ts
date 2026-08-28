"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { borrarTemporal, guardarTemporal, leerTemporal } from "@/lib/archivos";
import { db } from "@/lib/db";
import { parsePadron, type ErrorFila, type ResultadoParseo } from "@/lib/excel/parsePadron";
import { importarPadron, type ResumenImportacion } from "@/lib/padron/importarPadron";
import { MAXIMO_ARCHIVOS, ordenarTanda, TAMANIO_MAXIMO } from "@/lib/padron/tanda";
import { requireAdmin, requireZonaActivaId } from "@/lib/sesion";

const EXTENSIONES = [".xls", ".xlsx"];

/** Un archivo que ya se analizo y espera confirmacion. */
export type ArchivoPendiente = {
  token: string;
  nombre: string;
  filas: number;
  /** Meses que trae, como "2026-03". */
  periodos: string[];
  errores: ErrorFila[];
};

export type ResultadoArchivo = {
  nombre: string;
  resumen: ResumenImportacion | null;
  /** Por que no entro. `null` si entro bien. */
  error: string | null;
};

export type EstadoImportacion =
  | { paso: "inicial"; error?: string }
  | {
      paso: "preview";
      archivos: ArchivoPendiente[];
      /**
       * Que va a pasar al confirmar. Solo se calcula cuando hay UN archivo:
       * con varios, la simulacion del segundo correria contra una base que
       * todavia no tiene importado el primero, asi que darian numeros que no
       * se van a cumplir. Ver el comentario de `importarTanda`.
       */
      resumen: ResumenImportacion | null;
      /** Union de los NomVen sin vincular de todos los archivos. */
      nomVenSinMapear: string[];
      error?: string;
    }
  | { paso: "importado"; resultados: ResultadoArchivo[] };

function periodosDe(fechas: Date[]): string[] {
  const meses = new Set(fechas.map((f) => f.toISOString().slice(0, 7)));
  return [...meses].sort();
}

/**
 * Los NomVen que todavia no tienen alias, sobre la union de varios archivos.
 * Misma regla que aplica `importarPadron`: nunca se agrupa por el texto crudo
 * del padron, se resuelve por `VendedorAlias`.
 */
async function nomVenSinVincular(nomVen: string[], zonaId: number): Promise<string[]> {
  const unicos = [...new Set(nomVen)];
  if (unicos.length === 0) return [];

  const alias = await db.vendedorAlias.findMany({
    where: { nomVenPadron: { in: unicos }, vendedor: { zonaId } },
    select: { nomVenPadron: true },
  });
  const vinculados = new Set(alias.map((a) => a.nomVenPadron));

  return unicos.filter((nombre) => !vinculados.has(nombre)).sort();
}

type ArchivoLeido = { nombre: string; parseo: ResultadoParseo };

function fichaDe(leido: ArchivoLeido, token: string): ArchivoPendiente {
  return {
    token,
    nombre: leido.nombre,
    filas: leido.parseo.filas.length,
    periodos: periodosDe(leido.parseo.filas.map((f) => f.emision)),
    errores: leido.parseo.errores.slice(0, 20),
  };
}

/** Del mas viejo al mas nuevo. La regla y su porque estan en `tanda.ts`. */
function ordenar<T extends ArchivoLeido>(leidos: T[]): T[] {
  return ordenarTanda(leidos, (leido) => ({
    periodoDesde: leido.parseo.periodoDesde,
    nombre: leido.nombre,
  }));
}

/**
 * Paso 1: se suben uno o varios archivos, se parsean y se devuelve el preview.
 * No escribe nada en la base: solo calcula que pasaria.
 */
export async function analizarPadron(
  _previo: EstadoImportacion,
  formData: FormData
): Promise<EstadoImportacion> {
  await requireAdmin();
  const zonaId = await requireZonaActivaId();

  const entrantes = formData
    .getAll("archivo")
    .filter((valor): valor is File => valor instanceof File && valor.size > 0);

  if (entrantes.length === 0) {
    return { paso: "inicial", error: "Elegí al menos un archivo." };
  }
  if (entrantes.length > MAXIMO_ARCHIVOS) {
    return {
      paso: "inicial",
      error: `Son ${entrantes.length} archivos y el tope por tanda es ${MAXIMO_ARCHIVOS}. Subilos en dos veces, del más viejo al más nuevo.`,
    };
  }

  for (const archivo of entrantes) {
    if (!EXTENSIONES.some((ext) => archivo.name.toLowerCase().endsWith(ext))) {
      return { paso: "inicial", error: `${archivo.name} no es un .xls ni un .xlsx.` };
    }
    if (archivo.size > TAMANIO_MAXIMO) {
      return { paso: "inicial", error: `${archivo.name} supera los 25 MB.` };
    }
  }

  // Se parsea todo ANTES de guardar ningun temporal: si el tercero esta roto,
  // no tienen por que quedar dos archivos huerfanos en uploads/tmp de una
  // tanda que nunca existio.
  const leidos: (ArchivoLeido & { contenido: Buffer })[] = [];
  for (const archivo of entrantes) {
    const contenido = Buffer.from(await archivo.arrayBuffer());

    let parseo;
    try {
      parseo = parsePadron(contenido);
    } catch (error) {
      const motivo = error instanceof Error ? error.message : "No se pudo leer el archivo.";
      return { paso: "inicial", error: `${archivo.name}: ${motivo}` };
    }

    if (parseo.filas.length === 0) {
      return { paso: "inicial", error: `${archivo.name} no tiene ninguna fila válida.` };
    }

    leidos.push({ nombre: archivo.name, contenido, parseo });
  }

  const ordenados = ordenar(leidos);
  const archivos: ArchivoPendiente[] = [];
  for (const leido of ordenados) {
    archivos.push(fichaDe(leido, await guardarTemporal(leido.contenido, leido.nombre)));
  }

  return {
    paso: "preview",
    archivos,
    resumen:
      ordenados.length === 1
        ? await importarPadron({
            filas: ordenados[0].parseo.filas,
            zonaId,
            soloSimular: true,
            columnasPersonales: ordenados[0].parseo.columnasPersonales,
          })
        : null,
    nomVenSinMapear: await nomVenSinVincular(
      ordenados.flatMap((l) => l.parseo.nomVenEncontrados),
      zonaId
    ),
  };
}

/**
 * Importa la tanda en orden, cada archivo en su propia transaccion y con su
 * propio `PadronImport`.
 *
 * No se juntan las filas de todos en una sola llamada aunque `importarPadron`
 * lo aceptaria: el origen del titulo se decide por la cuota mas baja del
 * conjunto que recibe, asi que mezclar meses convertiria renovaciones en
 * ventas nuevas. Ademas el historico de `/admin/padron` y las barras de
 * produccion del dashboard cuentan una fila por archivo.
 *
 * Si uno falla, los anteriores quedan importados: son archivos independientes
 * y deshacerlos seria peor que dejarlos. Se corta ahi y se dice cual fue.
 */
async function importarTanda(
  leidos: ArchivoLeido[],
  zonaId: number,
  importadoPorUserId: string
): Promise<ResultadoArchivo[]> {
  const resultados: ResultadoArchivo[] = [];
  let corto = false;

  for (const leido of leidos) {
    if (corto) {
      resultados.push({
        nombre: leido.nombre,
        resumen: null,
        error: "No se importó: la tanda se cortó en un archivo anterior.",
      });
      continue;
    }

    try {
      const resumen = await importarPadron({
        filas: leido.parseo.filas,
        zonaId,
        soloSimular: false,
        columnasPersonales: leido.parseo.columnasPersonales,
        lote: {
          archivoNombre: leido.nombre,
          importadoPorUserId,
          periodoDesde: leido.parseo.periodoDesde,
          periodoHasta: leido.parseo.periodoHasta,
        },
      });
      resultados.push({ nombre: leido.nombre, resumen, error: null });
    } catch (error) {
      corto = true;
      resultados.push({
        nombre: leido.nombre,
        resumen: null,
        error: error instanceof Error ? error.message : "No se pudo importar.",
      });
    }
  }

  return resultados;
}

/**
 * Paso 2: vincula los NomVen pendientes con vendedores ya cargados y, si no
 * queda ninguno sin vincular y el admin confirmo, aplica la importacion.
 */
export async function procesarPadron(
  _previo: EstadoImportacion,
  formData: FormData
): Promise<EstadoImportacion> {
  const usuario = await requireAdmin();
  const zonaId = await requireZonaActivaId();

  const tokens = [...new Set(formData.getAll("token").map(String).filter(Boolean))];
  if (tokens.length === 0) {
    return { paso: "inicial", error: "Se perdieron los archivos. Subilos de nuevo." };
  }

  // Se vuelve a leer y a parsear desde el temporal en vez de confiar en lo que
  // manda el navegador: de esto dependen el orden de importacion y a quien se
  // le imputan las cuotas.
  const leidos: (ArchivoLeido & { token: string })[] = [];
  for (const token of tokens) {
    try {
      const archivo = await leerTemporal(token);
      leidos.push({
        token,
        nombre: archivo.nombreOriginal,
        parseo: parsePadron(archivo.contenido),
      });
    } catch {
      return {
        paso: "inicial",
        error: "Alguno de los archivos ya no está disponible. Subilos de nuevo.",
      };
    }
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

  const ordenados = ordenar(leidos);
  const nomVenSinMapear = await nomVenSinVincular(
    ordenados.flatMap((l) => l.parseo.nomVenEncontrados),
    zonaId
  );

  const preview: Extract<EstadoImportacion, { paso: "preview" }> = {
    paso: "preview",
    archivos: ordenados.map((leido) => fichaDe(leido, leido.token)),
    resumen:
      ordenados.length === 1
        ? await importarPadron({
            filas: ordenados[0].parseo.filas,
            zonaId,
            soloSimular: true,
            columnasPersonales: ordenados[0].parseo.columnasPersonales,
          })
        : null,
    nomVenSinMapear,
  };

  if (formData.get("confirmar") !== "1") return preview;

  if (nomVenSinMapear.length > 0) {
    return { ...preview, error: "Todavía quedan vendedores sin vincular." };
  }

  const resultados = await importarTanda(ordenados, zonaId, usuario.id);

  // Se descartan todos, incluso los de una tanda que se corto: el formulario
  // ya no los puede retomar, asi que quedarian huerfanos en uploads/tmp.
  await Promise.all(tokens.map(borrarTemporal));

  revalidatePath("/admin/padron");
  revalidatePath("/admin/clientes");
  revalidatePath("/admin/dashboard");

  return { paso: "importado", resultados };
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

/**
 * El "Cancelar" del preview. Era un `<Link>`, asi que los temporales quedaban
 * en disco para siempre: esta accion existia desde el principio y no la
 * llamaba nadie. Con varios archivos por tanda el descuido se multiplica.
 */
export async function descartarPadron(formData: FormData) {
  await requireAdmin();
  const tokens = formData.getAll("token").map(String).filter(Boolean);
  await Promise.all(tokens.map(borrarTemporal));
  redirect("/admin/padron");
}
