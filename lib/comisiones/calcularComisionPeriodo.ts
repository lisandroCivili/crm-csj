/**
 * MOTOR DE COMISIONES
 *
 * Funcion pura: no toca la base ni la sesion. Todo lo que necesita llega por
 * parametro y siempre devuelve lo mismo para la misma entrada. Eso importa
 * porque es el unico lugar del sistema donde un bug se traduce en plata mal
 * liquidada: asi se puede testear a mano, sin base ni servidor.
 *
 * REGLAS (confirmadas por Balta el 2026-08-12, ver docs/PENDIENTE.md):
 *
 * 1. La comision sale del PADRON, no de las ventas cargadas en el CRM. La
 *    materia prima son las cuotas que el padron muestra recien cobradas.
 * 2. El porcentaje se aplica sobre el IMPORTE de las cuotas cobradas, no sobre
 *    el valor nominal del plan.
 * 3. Las cuotas se agrupan POR NUMERO DE CUOTA: cada numero tiene su propio
 *    porcentaje (la cuota 1 suele ser la de mayor comision).
 * 4. El tramo de la escala se define POR MES, no por acumulado historico: lo
 *    determina la cantidad de ventas nuevas (cuotas 1) de ese mes. Puede ser 0,
 *    y en ese caso el vendedor igual cobra sus cuotas 2, 3... al porcentaje mas
 *    bajo de la escala (basta con que exista un tramo con ventasMin = 0).
 * 5. Cada vendedor cobra hasta cierto numero de cuota (`topeCuotasComision`,
 *    de c1 a c5). Lo que pase de ahi no se comisiona.
 *
 * Los porcentajes SIEMPRE vienen de `EscalaComision`, cargada por Balta desde
 * la UI. Nunca se hardcodean.
 */

/** Una cuota que el padron mostro cobrada dentro del periodo liquidado. */
export type CuotaCobrada = {
  id: string;
  numeroCuota: number;
  /** Importe en pesos, tal como vino del padron. */
  importe: number;
};

/** Una fila de `EscalaComision`, con el porcentaje ya convertido a numero. */
export type FilaEscala = {
  ventasMin: number;
  /** null = sin tope superior. */
  ventasMax: number | null;
  numeroCuota: number;
  /** Porcentaje, no fraccion: 2.5 significa 2,5 %. */
  porcentaje: number;
};

export type EntradaCalculo = {
  cuotas: CuotaCobrada[];
  escalas: FilaEscala[];
  /** Hasta que numero de cuota cobra este vendedor (1 a 5). */
  topeCuotasComision: number;
  /** Importe manual que agrega Balta al periodo. */
  gastosRepresentacion?: number;
};

/** Un renglon de la liquidacion: todas las cuotas N cobradas en el periodo. */
export type GrupoComision = {
  numeroCuota: number;
  cantidadCuotas: number;
  /** Suma de los importes del grupo. */
  baseCalculo: number;
  porcentajeAplicado: number;
  monto: number;
  /** Ids de las cuotas que entraron, para poder auditar el renglon. */
  cuotaIds: string[];
};

export type TramoAplicado = { ventasMin: number; ventasMax: number | null };

export type ResultadoComision = {
  /** Cuotas 1 cobradas en el mes: es el volumen que define el tramo. */
  ventasNuevas: number;
  /** null cuando la escala no cubre ese volumen (falta cargar el tramo). */
  tramo: TramoAplicado | null;
  grupos: GrupoComision[];
  /** Cuotas descartadas por superar el tope del vendedor. */
  cuotasFueraDeTope: number;
  baseFueraDeTope: number;
  totalComisionCuotas: number;
  gastosRepresentacion: number;
  totalComision: number;
  /** Problemas de configuracion que hay que mostrarle a Balta. */
  advertencias: string[];
};

/**
 * Plata en centavos enteros mientras se acumula. Sumar floats de a cientos de
 * cuotas arrastra error suficiente para que el total no cierre contra el
 * padron por unos centavos.
 */
function aCentavos(pesos: number): number {
  return Math.round(pesos * 100);
}

function aPesos(centavos: number): number {
  return centavos / 100;
}

/**
 * Tramo que corresponde a `ventasNuevas`. Si varios lo contienen (escala mal
 * cargada, con solapamiento), gana el de piso mas alto: es el que el vendedor
 * se gano.
 */
export function tramoParaVolumen(
  escalas: FilaEscala[],
  ventasNuevas: number
): TramoAplicado | null {
  let elegido: TramoAplicado | null = null;

  for (const fila of escalas) {
    const dentro =
      ventasNuevas >= fila.ventasMin &&
      (fila.ventasMax === null || ventasNuevas <= fila.ventasMax);
    if (!dentro) continue;
    if (elegido === null || fila.ventasMin > elegido.ventasMin) {
      elegido = { ventasMin: fila.ventasMin, ventasMax: fila.ventasMax };
    }
  }

  return elegido;
}

export function calcularComisionPeriodo({
  cuotas,
  escalas,
  topeCuotasComision,
  gastosRepresentacion = 0,
}: EntradaCalculo): ResultadoComision {
  const advertencias: string[] = [];

  // --- 1. Volumen del mes: cuantas ventas nuevas (cuota 1) hubo -------------
  const ventasNuevas = cuotas.filter((cuota) => cuota.numeroCuota === 1).length;

  // --- 2. Tramo de escala que le toca a ese volumen ------------------------
  const tramo = tramoParaVolumen(escalas, ventasNuevas);
  if (tramo === null && cuotas.length > 0) {
    advertencias.push(
      `No hay ningún tramo de escala que cubra ${ventasNuevas} ventas nuevas. ` +
        "Cargá la escala antes de liquidar."
    );
  }

  const porcentajePorCuota = new Map<number, number>();
  if (tramo) {
    for (const fila of escalas) {
      if (fila.ventasMin === tramo.ventasMin) {
        porcentajePorCuota.set(fila.numeroCuota, fila.porcentaje);
      }
    }
  }

  // --- 3. Descartar lo que pasa el tope del vendedor ------------------------
  let cuotasFueraDeTope = 0;
  let baseFueraDeTopeCentavos = 0;

  const porNumero = new Map<number, { cuotaIds: string[]; baseCentavos: number }>();

  for (const cuota of cuotas) {
    const centavos = aCentavos(cuota.importe);

    if (cuota.numeroCuota > topeCuotasComision) {
      cuotasFueraDeTope++;
      baseFueraDeTopeCentavos += centavos;
      continue;
    }

    // --- 4. Agrupar por numero de cuota ------------------------------------
    const grupo = porNumero.get(cuota.numeroCuota) ?? { cuotaIds: [], baseCentavos: 0 };
    grupo.cuotaIds.push(cuota.id);
    grupo.baseCentavos += centavos;
    porNumero.set(cuota.numeroCuota, grupo);
  }

  // --- 5. Un renglon por grupo, con su porcentaje ---------------------------
  const numerosOrdenados = [...porNumero.keys()].sort((a, b) => a - b);
  const grupos: GrupoComision[] = [];
  let totalCentavos = 0;

  for (const numeroCuota of numerosOrdenados) {
    const { cuotaIds, baseCentavos } = porNumero.get(numeroCuota)!;
    const porcentaje = porcentajePorCuota.get(numeroCuota);

    if (porcentaje === undefined && tramo !== null) {
      advertencias.push(
        `El tramo desde ${tramo.ventasMin} ventas no tiene porcentaje cargado para la cuota ${numeroCuota}.`
      );
    }

    const porcentajeAplicado = porcentaje ?? 0;
    const montoCentavos = Math.round((baseCentavos * porcentajeAplicado) / 100);
    totalCentavos += montoCentavos;

    grupos.push({
      numeroCuota,
      cantidadCuotas: cuotaIds.length,
      baseCalculo: aPesos(baseCentavos),
      porcentajeAplicado,
      monto: aPesos(montoCentavos),
      cuotaIds,
    });
  }

  // --- 6. Totales ----------------------------------------------------------
  const gastosCentavos = aCentavos(gastosRepresentacion);

  return {
    ventasNuevas,
    tramo,
    grupos,
    cuotasFueraDeTope,
    baseFueraDeTope: aPesos(baseFueraDeTopeCentavos),
    totalComisionCuotas: aPesos(totalCentavos),
    gastosRepresentacion: aPesos(gastosCentavos),
    totalComision: aPesos(totalCentavos + gastosCentavos),
    advertencias,
  };
}
