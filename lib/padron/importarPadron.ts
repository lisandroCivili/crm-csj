import type { FilaPadron } from "@/lib/excel/parsePadron";
import type { TituloOrigen } from "@/lib/generated/prisma/client";
import { db } from "@/lib/db";
import {
  CAMPOS_PERSONALES,
  cambiosDelCliente,
  datosDeClienteNuevo,
  type CampoPersonal,
} from "./camposCliente";
import { cuotasInicialesDelArchivo, origenDeTituloNuevo } from "./origenTitulo";
import { recalcularCaidas } from "./recalcularCaidas";

/**
 * IMPORTACION DEL PADRON
 *
 * El padron que envia el club trae 3 meses por titulo (cuotas n, n+1 y n+2), no
 * una foto del mes actual. Segun cada cuanto lo emitan, dos padrones sucesivos
 * pueden solaparse: si sale uno por mes, dos de las tres cuotas ya estaban
 * cargadas.
 *
 * Por eso esto NO es un append: es un upsert idempotente sobre la clave
 * (tituloId, numeroCuota). Reimportar el mismo archivo no duplica ni altera
 * nada, y la numeracion de cuotas continua sola desde donde iba sin que el
 * sistema tenga que adivinar.
 *
 * De paso es el unico momento en que se puede saber COMO entro cada titulo:
 * comparando contra lo que ya habia. Ver `origenTitulo.ts`.
 */

export type ResumenImportacion = {
  filasProcesadas: number;
  clientesNuevos: number;
  clientesActualizados: number;
  titulosNuevos: number;
  titulosActualizados: number;
  cuotasNuevas: number;
  cuotasActualizadas: number;
  cuotasSinCambios: number;
  /** Cuotas que pasaron de impagas a pagadas: base del calculo de comisiones. */
  cuotasRecienPagadas: number;
  /** De los titulos nuevos, los que entraron con cuota 1. */
  titulosNuevosVenta: number;
  /** De los titulos nuevos, los que entraron con cuota mayor a 1. */
  titulosNuevosRenovacion: number;
  /** Primera importacion de la zona: todos sus titulos quedan como BASE. */
  esLineaBase: boolean;
  /** Nombres de NomVen que todavia no estan vinculados a un vendedor. */
  nomVenSinMapear: string[];
  /**
   * Numeros de titulo del archivo que ya existen, pero en OTRA zona.
   *
   * `Titulo.numTit` es unico en todo el sistema, asi que un numero que ya esta
   * en la otra zona no se puede crear aca. Antes esto ni se miraba: la busqueda
   * de titulos no filtraba por zona, el titulo ajeno se daba por existente y se
   * le pisaba el vendedor con el de este padron. La comision de una zona pasaba
   * a calcularse con la produccion de la otra.
   */
  titulosDeOtraZona: string[];
  /**
   * De los titulos del archivo, cuantos quedaron caidos despues de importarlo.
   * Es el total, no los que se cayeron recien. Al simular queda en 0: la caida
   * se calcula sobre el historico ya escrito.
   */
  titulosCaidos: number;
};

type OpcionesImportacion = {
  filas: FilaPadron[];
  zonaId: number;
  /** Cuando es true no escribe nada: solo calcula el resumen para el preview. */
  soloSimular: boolean;
  /**
   * Cuales de los datos personales del cliente venian como columna en el
   * archivo (`parsePadron` lo devuelve). Los que falten no se escriben: un
   * `null` de una columna ausente no dice "esta vacio", dice "no vino", y sin
   * esta distincion la importacion borraba el dato en toda la zona.
   *
   * Si no se pasa se asume que estaban todas, que es como se comportaba antes.
   */
  columnasPersonales?: readonly CampoPersonal[];
  /** Datos del lote. No hacen falta al simular. */
  lote?: {
    archivoNombre: string;
    importadoPorUserId: string;
    periodoDesde: Date | null;
    periodoHasta: Date | null;
  };
};

function enTandas<T>(items: T[], tamanio: number): T[][] {
  const tandas: T[][] = [];
  for (let i = 0; i < items.length; i += tamanio) {
    tandas.push(items.slice(i, i + tamanio));
  }
  return tandas;
}

function mismoImporte(guardado: unknown, delArchivo: number): boolean {
  return Number(guardado) === Math.round(delArchivo * 100) / 100;
}

function mismaFecha(guardada: Date | null, delArchivo: Date | null): boolean {
  if (guardada === null && delArchivo === null) return true;
  if (guardada === null || delArchivo === null) return false;
  return guardada.getTime() === delArchivo.getTime();
}

/**
 * Se queda con una fila por clave, la de emision mas reciente: las 3 filas de un
 * titulo repiten los datos del cliente, y si alguno cambio queremos el ultimo.
 */
function ultimaPorClave<T extends { emision: Date }>(
  filas: T[],
  clave: (fila: T) => string
): Map<string, T> {
  const mapa = new Map<string, T>();
  for (const fila of filas) {
    const k = clave(fila);
    const previa = mapa.get(k);
    if (!previa || fila.emision > previa.emision) mapa.set(k, fila);
  }
  return mapa;
}

export async function importarPadron({
  filas,
  zonaId,
  soloSimular,
  columnasPersonales,
  lote,
}: OpcionesImportacion): Promise<ResumenImportacion> {
  const resumen: ResumenImportacion = {
    filasProcesadas: filas.length,
    clientesNuevos: 0,
    clientesActualizados: 0,
    titulosNuevos: 0,
    titulosActualizados: 0,
    cuotasNuevas: 0,
    cuotasActualizadas: 0,
    cuotasSinCambios: 0,
    cuotasRecienPagadas: 0,
    titulosNuevosVenta: 0,
    titulosNuevosRenovacion: 0,
    esLineaBase: false,
    nomVenSinMapear: [],
    titulosDeOtraZona: [],
    titulosCaidos: 0,
  };

  if (filas.length === 0) return resumen;

  // Sin padron anterior no hay con que comparar: todo lo que traiga el primero
  // es historia previa al sistema, no produccion del mes.
  resumen.esLineaBase = (await db.padronImport.count({ where: { zonaId } })) === 0;

  // --- 1. NomVen -> vendedor ------------------------------------------------
  // Nunca se agrupa por el texto crudo del padron: se resuelve por alias.
  const nomVenDelArchivo = [...new Set(filas.map((f) => f.nomVen))];
  const alias = await db.vendedorAlias.findMany({
    where: { zonaId, nomVenPadron: { in: nomVenDelArchivo } },
    select: { nomVenPadron: true, vendedorId: true },
  });
  const vendedorPorNomVen = new Map(alias.map((a) => [a.nomVenPadron, a.vendedorId]));

  resumen.nomVenSinMapear = nomVenDelArchivo
    .filter((nombre) => !vendedorPorNomVen.has(nombre))
    .sort();

  // Sin todos los vendedores resueltos no se importa: imputar cuotas al
  // vendedor equivocado corrompe el calculo de comisiones.
  if (resumen.nomVenSinMapear.length > 0 && !soloSimular) {
    throw new Error(
      `Faltan vincular ${resumen.nomVenSinMapear.length} nombres de vendedor antes de importar.`
    );
  }

  // --- 2. Clientes ----------------------------------------------------------
  const columnas = columnasPersonales ?? CAMPOS_PERSONALES;
  const clientesDelArchivo = ultimaPorClave(filas, (f) => f.dni);
  const dnis = [...clientesDelArchivo.keys()];

  const clientesExistentes = await db.cliente.findMany({
    where: { zonaId, dni: { in: dnis } },
  });
  const clientePorDni = new Map(clientesExistentes.map((c) => [c.dni, c]));

  const clientesACrear: {
    dni: string;
    nombre: string;
    domicilio: string | null;
    telefono: string | null;
    codPos: string | null;
    localidad: string | null;
    email: string | null;
    zonaId: number;
  }[] = [];
  const clientesAActualizar: { id: string; datos: Record<string, unknown> }[] = [];

  for (const [dni, fila] of clientesDelArchivo) {
    const datos = {
      nombre: fila.nombre,
      domicilio: fila.domicilio,
      telefono: fila.telefono,
      codPos: fila.codPos,
      localidad: fila.localidad,
      email: fila.email,
    };
    const existente = clientePorDni.get(dni);

    if (!existente) {
      clientesACrear.push({
        dni,
        zonaId,
        ...datosDeClienteNuevo(datos, columnas),
        // `nombre` es requerido y `parsePadron` ya descarto las filas sin el.
        nombre: fila.nombre,
      });
      resumen.clientesNuevos++;
      continue;
    }

    // Que campos toca el padron lo decide `camposCliente.ts`: no toca los que
    // el admin corrigio a mano ni los que no vinieron como columna.
    const cambios = cambiosDelCliente(existente, datos, columnas);
    if (cambios) {
      clientesAActualizar.push({ id: existente.id, datos: cambios });
      resumen.clientesActualizados++;
    }
  }

  // --- 3. Titulos -----------------------------------------------------------
  const titulosDelArchivo = ultimaPorClave(filas, (f) => f.numTit);
  const numTits = [...titulosDelArchivo.keys()];

  // Los titulos se buscan DENTRO de la zona. Sin ese filtro, importar el padron
  // de Tucuman encontraba los titulos de Salta con el mismo NumTit, los daba por
  // existentes y les pisaba el vendedor con el de este archivo: la comision de
  // una zona quedaba calculada con la produccion de la otra.
  const titulosConEseNumero = await db.titulo.findMany({
    where: { numTit: { in: numTits } },
  });
  const titulosExistentes = titulosConEseNumero.filter((t) => t.zonaId === zonaId);
  const tituloPorNumTit = new Map(titulosExistentes.map((t) => [t.numTit, t]));

  // Y como el numero es unico en todo el sistema, el que ya esta en la otra zona
  // tampoco se puede crear: sin este aviso la importacion reventaria recien al
  // insertar, con un choque de clave que no explica nada.
  resumen.titulosDeOtraZona = titulosConEseNumero
    .filter((t) => t.zonaId !== zonaId)
    .map((t) => t.numTit)
    .sort();

  if (resumen.titulosDeOtraZona.length > 0 && !soloSimular) {
    const muestra = resumen.titulosDeOtraZona.slice(0, 5).join(", ");
    throw new Error(
      `${resumen.titulosDeOtraZona.length} título(s) de este archivo ya existen en otra zona (${muestra}). ` +
        `El número de título es único en todo el sistema: revisá que el archivo sea de la zona que tenés activa.`
    );
  }

  // El origen se decide una sola vez, con la cuota mas baja que trae el archivo
  // que lo estrena. Los titulos que ya existen no se tocan: si se recalculara
  // en cada importacion, un titulo pasaria de venta nueva a renovacion apenas
  // el padron dejara de traer su cuota 1.
  const cuotasIniciales = cuotasInicialesDelArchivo(filas);
  const estrenoPorNumTit = new Map<string, { origen: TituloOrigen; cuotaInicial: number }>();

  for (const [numTit, fila] of titulosDelArchivo) {
    const existente = tituloPorNumTit.get(numTit);
    if (!existente) {
      resumen.titulosNuevos++;

      const cuotaInicial = cuotasIniciales.get(numTit)!;
      const origen = origenDeTituloNuevo({
        cuotaInicial,
        esLineaBase: resumen.esLineaBase,
      });
      estrenoPorNumTit.set(numTit, { origen, cuotaInicial });

      if (origen === "VENTA_NUEVA") resumen.titulosNuevosVenta++;
      if (origen === "RENOVACION") resumen.titulosNuevosRenovacion++;
      continue;
    }
    const cambio =
      existente.numSor !== fila.numSor ||
      existente.debitoAutomatico !== fila.debitoAutomatico ||
      existente.codDistribucion !== fila.codDistribucion ||
      existente.nomDistribucion !== fila.nomDistribucion ||
      existente.cuotasPagas !== fila.cuotasPagas ||
      !mismoImporte(existente.rescate ?? 0, fila.rescate ?? 0) ||
      existente.vendedorId !== (vendedorPorNomVen.get(fila.nomVen) ?? null);
    if (cambio) resumen.titulosActualizados++;
  }

  // --- 4. Cuotas ------------------------------------------------------------
  // Solo se pueden comparar las de titulos que ya existen; las de titulos nuevos
  // son nuevas por definicion.
  const idsTitulosExistentes = new Map(
    titulosExistentes.map((t) => [t.numTit, t.id] as const)
  );

  const paresAConsultar = filas
    .filter((f) => idsTitulosExistentes.has(f.numTit))
    .map((f) => ({
      tituloId: idsTitulosExistentes.get(f.numTit)!,
      numeroCuota: f.numeroCuota,
    }));

  // Se consulta por pares exactos y en tandas: pedir todas las cuotas de cada
  // titulo traeria cientos de filas historicas que no hacen falta.
  const cuotasExistentes = new Map<
    string,
    { id: string; importe: unknown; fechaPago: Date | null; detalle: string | null; boni: string | null; anti: string | null; periodoEmision: Date; detectadaPagaAt: Date | null }
  >();

  for (const tanda of enTandas(paresAConsultar, 400)) {
    if (tanda.length === 0) continue;
    const encontradas = await db.tituloCuota.findMany({
      where: { OR: tanda.map((p) => ({ tituloId: p.tituloId, numeroCuota: p.numeroCuota })) },
      select: {
        id: true,
        tituloId: true,
        numeroCuota: true,
        importe: true,
        fechaPago: true,
        detalle: true,
        boni: true,
        anti: true,
        periodoEmision: true,
        detectadaPagaAt: true,
      },
    });
    for (const cuota of encontradas) {
      cuotasExistentes.set(`${cuota.tituloId}:${cuota.numeroCuota}`, cuota);
    }
  }

  type PlanCuota =
    | { tipo: "nueva"; fila: FilaPadron; recienPagada: boolean }
    | { tipo: "actualizar"; id: string; fila: FilaPadron; recienPagada: boolean }
    | { tipo: "sinCambios" };

  const planCuotas: PlanCuota[] = filas.map((fila) => {
    const tituloId = idsTitulosExistentes.get(fila.numTit);
    const existente = tituloId
      ? cuotasExistentes.get(`${tituloId}:${fila.numeroCuota}`)
      : undefined;

    if (!existente) {
      return { tipo: "nueva", fila, recienPagada: fila.fechaPago !== null };
    }

    const recienPagada = existente.fechaPago === null && fila.fechaPago !== null;
    const cambio =
      !mismoImporte(existente.importe, fila.importe) ||
      !mismaFecha(existente.fechaPago, fila.fechaPago) ||
      !mismaFecha(existente.periodoEmision, fila.emision) ||
      existente.detalle !== fila.detalle ||
      existente.boni !== fila.boni ||
      existente.anti !== fila.anti;

    if (!cambio) return { tipo: "sinCambios" };
    return { tipo: "actualizar", id: existente.id, fila, recienPagada };
  });

  for (const plan of planCuotas) {
    if (plan.tipo === "nueva") {
      resumen.cuotasNuevas++;
      if (plan.recienPagada) resumen.cuotasRecienPagadas++;
    } else if (plan.tipo === "actualizar") {
      resumen.cuotasActualizadas++;
      if (plan.recienPagada) resumen.cuotasRecienPagadas++;
    } else {
      resumen.cuotasSinCambios++;
    }
  }

  if (soloSimular) return resumen;
  if (!lote) throw new Error("Faltan los datos del lote de importación.");

  // --- 5. Escritura ---------------------------------------------------------
  const ahora = new Date();

  await db.$transaction(
    async (tx) => {
      const padronImport = await tx.padronImport.create({
        data: {
          archivoNombre: lote.archivoNombre,
          zonaId,
          fechaEmisionArchivo: lote.periodoHasta,
          periodoDesde: lote.periodoDesde,
          periodoHasta: lote.periodoHasta,
          importadoPorUserId: lote.importadoPorUserId,
          filasLeidas: filas.length,
          clientesNuevos: resumen.clientesNuevos,
          clientesActualizados: resumen.clientesActualizados,
          titulosNuevos: resumen.titulosNuevos,
          titulosActualizados: resumen.titulosActualizados,
          cuotasNuevas: resumen.cuotasNuevas,
          cuotasActualizadas: resumen.cuotasActualizadas,
          cuotasSinCambios: resumen.cuotasSinCambios,
          cuotasReciePagadas: resumen.cuotasRecienPagadas,
          titulosNuevosVenta: resumen.titulosNuevosVenta,
          titulosNuevosRenovacion: resumen.titulosNuevosRenovacion,
          esLineaBase: resumen.esLineaBase,
        },
        select: { id: true },
      });

      // Clientes
      if (clientesACrear.length > 0) {
        await tx.cliente.createMany({ data: clientesACrear });
      }
      for (const tanda of enTandas(clientesAActualizar, 100)) {
        await Promise.all(
          tanda.map((c) => tx.cliente.update({ where: { id: c.id }, data: c.datos }))
        );
      }

      // Se relee para tener el id de los recien creados.
      const clientes = await tx.cliente.findMany({
        where: { zonaId, dni: { in: dnis } },
        select: { id: true, dni: true },
      });
      const idClientePorDni = new Map(clientes.map((c) => [c.dni, c.id]));

      // Titulos
      const titulosACrear: {
        numTit: string;
        clienteId: string;
        vendedorId: string | null;
        numSor: string | null;
        debitoAutomatico: boolean;
        codDistribucion: string | null;
        nomDistribucion: string | null;
        rescate: number | null;
        cuotasPagas: number | null;
        origen: TituloOrigen;
        cuotaInicial: number;
        zonaId: number;
        vistoEnPadronAt: Date;
        ultimoPadronImportId: string;
      }[] = [];

      for (const [numTit, fila] of titulosDelArchivo) {
        const clienteId = idClientePorDni.get(fila.dni);
        if (!clienteId) continue;

        const datos = {
          vendedorId: vendedorPorNomVen.get(fila.nomVen) ?? null,
          numSor: fila.numSor,
          debitoAutomatico: fila.debitoAutomatico,
          codDistribucion: fila.codDistribucion,
          nomDistribucion: fila.nomDistribucion,
          rescate: fila.rescate,
          cuotasPagas: fila.cuotasPagas,
          vistoEnPadronAt: ahora,
          ultimoPadronImportId: padronImport.id,
        };

        const existente = tituloPorNumTit.get(numTit);
        if (existente) {
          // `origen` y `cuotaInicial` quedan afuera a proposito: se sellan al
          // crear el titulo y no se recalculan nunca mas.
          await tx.titulo.update({ where: { id: existente.id }, data: datos });
        } else {
          const estreno = estrenoPorNumTit.get(numTit)!;
          titulosACrear.push({
            numTit,
            clienteId,
            zonaId,
            origen: estreno.origen,
            cuotaInicial: estreno.cuotaInicial,
            ...datos,
          });
        }
      }

      if (titulosACrear.length > 0) {
        await tx.titulo.createMany({ data: titulosACrear });
      }

      const titulos = await tx.titulo.findMany({
        where: { zonaId, numTit: { in: numTits } },
        select: { id: true, numTit: true },
      });
      const idTituloPorNumTit = new Map(titulos.map((t) => [t.numTit, t.id]));

      // Cuotas: el upsert idempotente por (tituloId, numeroCuota).
      const cuotasACrear = planCuotas
        .filter((p) => p.tipo === "nueva")
        .map((p) => {
          const { fila, recienPagada } = p as Extract<PlanCuota, { tipo: "nueva" }>;
          return {
            tituloId: idTituloPorNumTit.get(fila.numTit)!,
            numeroCuota: fila.numeroCuota,
            periodoEmision: fila.emision,
            importe: fila.importe,
            fechaPago: fila.fechaPago,
            detalle: fila.detalle,
            boni: fila.boni,
            anti: fila.anti,
            detectadaPagaAt: recienPagada ? ahora : null,
            padronImportId: padronImport.id,
          };
        })
        .filter((c) => Boolean(c.tituloId));

      for (const tanda of enTandas(cuotasACrear, 1000)) {
        await tx.tituloCuota.createMany({ data: tanda, skipDuplicates: true });
      }

      const cuotasAActualizar = planCuotas.filter(
        (p): p is Extract<PlanCuota, { tipo: "actualizar" }> => p.tipo === "actualizar"
      );

      for (const tanda of enTandas(cuotasAActualizar, 100)) {
        await Promise.all(
          tanda.map(({ id, fila, recienPagada }) =>
            tx.tituloCuota.update({
              where: { id },
              data: {
                periodoEmision: fila.emision,
                importe: fila.importe,
                fechaPago: fila.fechaPago,
                detalle: fila.detalle,
                boni: fila.boni,
                anti: fila.anti,
                padronImportId: padronImport.id,
                // Solo se sella la primera vez que se la ve pagada.
                ...(recienPagada ? { detectadaPagaAt: ahora } : {}),
              },
            })
          )
        );
      }

      // --- 6. Caidas ---------------------------------------------------------
      // Va adentro de la transaccion y despues de escribir las cuotas: el
      // estado se calcula sobre el historico completo, incluidas las cuotas que
      // acaba de traer este archivo. Solo se revisan los titulos del padron;
      // los que no vinieron no cambiaron de historia.
      const caidas = await recalcularCaidas(tx, [...idTituloPorNumTit.values()], ahora);
      resumen.titulosCaidos = caidas.caidos;
    },
    { timeout: 180_000, maxWait: 20_000 }
  );

  return resumen;
}
