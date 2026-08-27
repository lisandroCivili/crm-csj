/**
 * MOTOR DE COMISION DEL AGENTE
 *
 * Hermano de `calcularComisionPeriodo`, y por la misma razon una funcion pura:
 * es plata, y hay que poder verificarla a mano sin base ni servidor.
 *
 * QUE CALCULA: lo que el CLUB le paga a la agencia. Es otro numero que lo que
 * la agencia le paga a sus vendedores, y las reglas no son las mismas.
 *
 * REGLAS (contrato de agencia, adenda del 13/01/2023; definiciones de Balta del
 * 27/08/2026, ver docs/PLAN.md):
 *
 * 1. La materia prima es la misma: las cuotas que el padron mostro cobradas en
 *    el mes, devengadas por `detectadaPagaAt`.
 * 2. Entran TODAS las cuotas de la zona, sin filtrar por vendedor: al agente le
 *    pagan por lo que cobra su agencia, incluidas las cuotas de titulos cuyo
 *    vendedor no se pudo identificar en el padron.
 * 3. NO hay tope de cuota 5. Ese tope es del vendedor; el contrato de agencia
 *    paga hasta la ultima cuota del plan. En el padron real la mayor parte del
 *    volumen son cuotas altas.
 * 4. Un solo eje: el numero de cuota decide el porcentaje. El volumen de ventas
 *    del mes NO mueve el porcentaje (a diferencia del vendedor).
 * 5. El objetivo de contratos del mes es informativo: si no se llega, se avisa
 *    pero se calcula igual. Todavia no esta definido a que esquema vuelve el
 *    contrato cuando no se alcanza.
 * 6. Los gastos de representacion NO entran aca: van aparte, en el balance del
 *    mes (Balta, 27/08/2026).
 *
 * Los porcentajes SIEMPRE vienen de `EscalaAgente`. Nunca se hardcodean.
 */

import type { CuotaCobrada } from "./calcularComisionPeriodo";

/** Una fila de `EscalaAgente`, con el porcentaje ya convertido a numero. */
export type TramoAgente = {
  cuotaDesde: number;
  /** null = de ahi en adelante, sin tope. */
  cuotaHasta: number | null;
  /** Porcentaje, no fraccion: 2.5 significa 2,5 %. */
  porcentaje: number;
};

export type EntradaCalculoAgente = {
  cuotas: CuotaCobrada[];
  tramos: TramoAgente[];
  /** Ventas nuevas del mes (titulos que entraron con cuota 1). */
  ventasNuevas?: number;
  /** Renovaciones del mes. Cuentan para el objetivo, igual que las ventas. */
  renovaciones?: number;
  /** Contratos que pide el contrato de agencia para este mes. 0 = sin objetivo. */
  objetivoContratos?: number;
};

/** Un renglon de la liquidacion: todas las cuotas que caen en el mismo tramo. */
export type GrupoAgente = {
  cuotaDesde: number;
  cuotaHasta: number | null;
  cantidadCuotas: number;
  /** Suma de los importes del grupo. */
  baseCalculo: number;
  porcentajeAplicado: number;
  monto: number;
  /** Ids de las cuotas que entraron, para poder auditar el renglon. */
  cuotaIds: string[];
};

export type ResultadoComisionAgente = {
  grupos: GrupoAgente[];
  /** Cuotas que ningun tramo cubre: son un hueco en la escala, no un cero. */
  cuotasSinTramo: number;
  baseSinTramo: number;
  cuotasCobradas: number;
  baseCobrada: number;
  totalComision: number;
  ventasNuevas: number;
  renovaciones: number;
  /** Ventas nuevas + renovaciones: las dos cuentan para el objetivo. */
  contratos: number;
  objetivoContratos: number;
  cumpleObjetivo: boolean;
  /** Problemas de configuracion o avisos que hay que mostrarle a Balta. */
  advertencias: string[];
};

function aCentavos(pesos: number): number {
  return Math.round(pesos * 100);
}

function aPesos(centavos: number): number {
  return centavos / 100;
}

/**
 * El tramo que le toca a un numero de cuota. Si dos tramos lo contienen (escala
 * mal cargada, con solapamiento), gana el de piso mas alto: es el mas
 * especifico de los dos.
 */
export function tramoParaCuota(tramos: TramoAgente[], numeroCuota: number): TramoAgente | null {
  let elegido: TramoAgente | null = null;

  for (const tramo of tramos) {
    const dentro =
      numeroCuota >= tramo.cuotaDesde &&
      (tramo.cuotaHasta === null || numeroCuota <= tramo.cuotaHasta);
    if (!dentro) continue;
    if (elegido === null || tramo.cuotaDesde > elegido.cuotaDesde) elegido = tramo;
  }

  return elegido;
}

export function calcularComisionAgente({
  cuotas,
  tramos,
  ventasNuevas = 0,
  renovaciones = 0,
  objetivoContratos = 0,
}: EntradaCalculoAgente): ResultadoComisionAgente {
  const advertencias: string[] = [];

  if (tramos.length === 0 && cuotas.length > 0) {
    advertencias.push(
      "No hay ningún tramo cargado en la escala del contrato de agencia: " +
        "todo liquida en cero hasta que la cargues."
    );
  }

  // --- 1. Cada cuota a su tramo --------------------------------------------
  // Se agrupa por el piso del tramo, no por numero de cuota: el contrato paga
  // por rango (1-2, 3-4, 5, 6-60, 61+), asi que un renglon por rango es como
  // se lee y como se controla contra la liquidacion del club.
  const porTramo = new Map<number, { tramo: TramoAgente; cuotaIds: string[]; baseCentavos: number }>();

  let cuotasSinTramo = 0;
  let baseSinTramoCentavos = 0;
  let baseCobradaCentavos = 0;
  const numerosSinTramo = new Set<number>();

  for (const cuota of cuotas) {
    const centavos = aCentavos(cuota.importe);
    baseCobradaCentavos += centavos;

    const tramo = tramoParaCuota(tramos, cuota.numeroCuota);
    if (tramo === null) {
      cuotasSinTramo++;
      baseSinTramoCentavos += centavos;
      numerosSinTramo.add(cuota.numeroCuota);
      continue;
    }

    const grupo = porTramo.get(tramo.cuotaDesde) ?? { tramo, cuotaIds: [], baseCentavos: 0 };
    grupo.cuotaIds.push(cuota.id);
    grupo.baseCentavos += centavos;
    porTramo.set(tramo.cuotaDesde, grupo);
  }

  if (numerosSinTramo.size > 0 && tramos.length > 0) {
    const cuales = [...numerosSinTramo].sort((a, b) => a - b);
    const muestra = cuales.slice(0, 5).map((n) => `c${n}`).join(", ");
    advertencias.push(
      `Hay ${cuotasSinTramo} cuota(s) que ningún tramo de la escala cubre (${muestra}` +
        `${cuales.length > 5 ? ", …" : ""}). No se están comisionando: dejá el último ` +
        "tramo sin techo para que cubra de ahí en adelante."
    );
  }

  // --- 2. Un renglon por tramo ---------------------------------------------
  const grupos: GrupoAgente[] = [];
  let totalCentavos = 0;

  for (const { tramo, cuotaIds, baseCentavos } of [...porTramo.values()].sort(
    (a, b) => a.tramo.cuotaDesde - b.tramo.cuotaDesde
  )) {
    const montoCentavos = Math.round((baseCentavos * tramo.porcentaje) / 100);
    totalCentavos += montoCentavos;

    grupos.push({
      cuotaDesde: tramo.cuotaDesde,
      cuotaHasta: tramo.cuotaHasta,
      cantidadCuotas: cuotaIds.length,
      baseCalculo: aPesos(baseCentavos),
      porcentajeAplicado: tramo.porcentaje,
      monto: aPesos(montoCentavos),
      cuotaIds,
    });
  }

  // --- 3. Objetivo del contrato --------------------------------------------
  // Informativo: avisa, no bloquea. Las renovaciones cuentan (Balta,
  // 27/08/2026), a diferencia del tramo del vendedor, donde no suman.
  const contratos = ventasNuevas + renovaciones;
  const cumpleObjetivo = objetivoContratos === 0 || contratos >= objetivoContratos;

  if (!cumpleObjetivo) {
    advertencias.push(
      `El mes cerró con ${contratos} contrato(s) y el contrato de agencia pide ` +
        `${objetivoContratos}. El cálculo se hace igual con la escala completa; falta ` +
        "definir a qué esquema vuelve el club cuando no se llega."
    );
  }

  return {
    grupos,
    cuotasSinTramo,
    baseSinTramo: aPesos(baseSinTramoCentavos),
    cuotasCobradas: cuotas.length,
    baseCobrada: aPesos(baseCobradaCentavos),
    totalComision: aPesos(totalCentavos),
    ventasNuevas,
    renovaciones,
    contratos,
    objetivoContratos,
    cumpleObjetivo,
    advertencias,
  };
}

/**
 * Problemas de la escala que harian que el agente cobre de menos. Se muestran
 * en la pantalla de la escala para corregirlos antes de liquidar.
 */
export function revisarEscalaAgente(tramos: TramoAgente[]): string[] {
  if (tramos.length === 0) return [];

  const avisos: string[] = [];
  const ordenados = [...tramos].sort((a, b) => a.cuotaDesde - b.cuotaDesde);

  if (ordenados[0].cuotaDesde !== 1) {
    avisos.push(
      `El primer tramo arranca en la cuota ${ordenados[0].cuotaDesde}: las cuotas ` +
        "anteriores no se comisionan. Agregá un tramo que empiece en 1."
    );
  }

  for (let i = 0; i < ordenados.length - 1; i++) {
    const actual = ordenados[i];
    const siguiente = ordenados[i + 1];

    if (actual.cuotaHasta === null) {
      avisos.push(
        `El tramo que arranca en la cuota ${actual.cuotaDesde} no tiene techo, pero ` +
          `hay otro más arriba (desde la ${siguiente.cuotaDesde}). Ponele un techo o ` +
          "va a pisar a los que siguen."
      );
      continue;
    }

    if (siguiente.cuotaDesde > actual.cuotaHasta + 1) {
      avisos.push(
        `Queda un hueco entre la cuota ${actual.cuotaHasta} y la ${siguiente.cuotaDesde}: ` +
          "esas cuotas no se comisionan."
      );
    }

    if (siguiente.cuotaDesde <= actual.cuotaHasta) {
      avisos.push(
        `Los tramos desde ${actual.cuotaDesde} y desde ${siguiente.cuotaDesde} se pisan. ` +
          "Gana el de piso más alto, pero conviene corregirlo."
      );
    }
  }

  if (ordenados[ordenados.length - 1].cuotaHasta !== null) {
    avisos.push(
      `El último tramo corta en la cuota ${ordenados[ordenados.length - 1].cuotaHasta}. ` +
        "Dejá su techo vacío para que cubra de ahí en adelante: los planes llegan a la 300."
    );
  }

  return avisos;
}
