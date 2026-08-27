/**
 * CAIDAS
 *
 * Balta lo definio asi el 24/08/2026: un titulo se cae cuando acumula 6 cuotas
 * **consecutivas** impagas. La caida no genera contracargo ni toca la comision;
 * es informacion, para saber a quien llamar.
 *
 * El sistema no puede deducirla del `cuotasPagas` que manda el club (ese numero
 * dice cuantas pago en total, no si las dejo de pagar seguidas) ni de una sola
 * importacion: hace falta el historico cuota por cuota que se va armando con
 * cada padron. Por eso esto se recalcula despues de importar.
 *
 * La parte delicada es saber **cuando no se sabe**. Si el historico tiene un
 * hueco en la numeracion, esa cuota faltante pudo estar paga, y contarla como
 * impaga seria inventar una caida. En ese caso el estado se informa como "sin
 * datos suficientes" en vez de mentir con un numero.
 *
 * Funcion pura y aparte para poder testear la regla sin base de datos.
 */

/** Cuotas impagas consecutivas con las que un titulo se da por caido. */
export const IMPAGAS_PARA_CAIDA = 6;

/**
 * Desde aca el titulo se muestra en riesgo: todavia no esta caido, pero es el
 * momento en que llamar al cliente sirve de algo.
 */
export const IMPAGAS_PARA_RIESGO = 3;

/** Lo unico que mira la regla de cada cuota del historico. */
export type CuotaConocida = { numeroCuota: number; pagada: boolean };

export type EstadoCaida = {
  /** Racha de impagas al final del historico. */
  impagasConsecutivas: number;
  /** Numero de la ultima cuota que algun padron mostro pagada. */
  cuotaUltimaPaga: number | null;
  /** Entre estas dos cuotas es lo que el sistema llego a ver del titulo. */
  cuotaMinConocida: number | null;
  cuotaMaxConocida: number | null;
  /** El historico alcanza para afirmar el estado. False = no se sabe. */
  confiable: boolean;
  caido: boolean;
  enRiesgo: boolean;
};

const SIN_DATOS: EstadoCaida = {
  impagasConsecutivas: 0,
  cuotaUltimaPaga: null,
  cuotaMinConocida: null,
  cuotaMaxConocida: null,
  confiable: false,
  caido: false,
  enRiesgo: false,
};

export function calcularEstadoCaida(cuotas: CuotaConocida[]): EstadoCaida {
  if (cuotas.length === 0) return { ...SIN_DATOS };

  const ordenadas = [...cuotas].sort((a, b) => b.numeroCuota - a.numeroCuota);
  const cuotaMaxConocida = ordenadas[0].numeroCuota;
  const cuotaMinConocida = ordenadas[ordenadas.length - 1].numeroCuota;
  const cuotaUltimaPaga = ordenadas.find((cuota) => cuota.pagada)?.numeroCuota ?? null;

  // La racha se cuenta desde la cuota mas alta hacia atras y solo mientras la
  // numeracion sea contigua: si falta un numero en el medio no sabemos si esa
  // cuota estaba paga, asi que la racha se corta ahi.
  let impagasConsecutivas = 0;
  let cortadaPorPago = false;
  let esperada = cuotaMaxConocida;

  for (const cuota of ordenadas) {
    if (cuota.numeroCuota !== esperada) break; // hueco en el historico
    if (cuota.pagada) {
      cortadaPorPago = true;
      break;
    }
    impagasConsecutivas++;
    esperada--;
  }

  const caido = impagasConsecutivas >= IMPAGAS_PARA_CAIDA;

  // Si ya llego al umbral, que falte historico hacia atras no lo desmiente:
  // mas impagas anteriores solo alargarian la racha. Si no llego, hace falta
  // haber visto la cuota paga que la corta —o haber llegado a la cuota 1, que
  // no tiene nada antes— para poder afirmar que la racha es esa y no mayor.
  const confiable = caido || cortadaPorPago || esperada === 0;

  return {
    impagasConsecutivas,
    cuotaUltimaPaga,
    cuotaMinConocida,
    cuotaMaxConocida,
    confiable,
    caido,
    enRiesgo: !caido && impagasConsecutivas >= IMPAGAS_PARA_RIESGO,
  };
}

/**
 * El club manda en `cuotasPagas` cuantas cuotas lleva pagas el titulo. Si ese
 * numero cubre hasta la ultima cuota que conocemos, el club lo esta dando al
 * dia, y lo que vemos impago probablemente se pago despues de emitido el
 * padron.
 *
 * No cambia el estado —el historico es el historico—, pero se muestra: es la
 * senal de que conviene mirar el titulo antes de llamar al cliente.
 */
export function contradiceAlClub({
  cuotasPagas,
  cuotaMaxConocida,
  impagasConsecutivas,
}: {
  cuotasPagas: number | null;
  cuotaMaxConocida: number | null;
  impagasConsecutivas: number;
}): boolean {
  if (cuotasPagas === null || cuotaMaxConocida === null) return false;
  return impagasConsecutivas > 0 && cuotasPagas >= cuotaMaxConocida;
}

/**
 * Estado del cliente, que es como lo pidio Balta: **parcial** cuando tiene
 * varios titulos y solo algunos estan caidos, **total** cuando se le cayeron
 * todos. Un cliente con un unico titulo caido cuenta como total.
 */
export type EstadoCaidaCliente = "TOTAL" | "PARCIAL" | "RIESGO" | "AL_DIA";

export function estadoCaidaDelCliente(
  titulos: { caido: boolean; impagasConsecutivas: number }[]
): EstadoCaidaCliente {
  if (titulos.length === 0) return "AL_DIA";

  const caidos = titulos.filter((titulo) => titulo.caido).length;
  if (caidos === titulos.length) return "TOTAL";
  if (caidos > 0) return "PARCIAL";

  const enRiesgo = titulos.some(
    (titulo) => titulo.impagasConsecutivas >= IMPAGAS_PARA_RIESGO
  );
  return enRiesgo ? "RIESGO" : "AL_DIA";
}
