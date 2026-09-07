/**
 * Formatos compartidos de las pantallas.
 *
 * Los importes se muestran sin decimales cuando son redondos y con centavos
 * cuando los tienen: una comision de $ 77.184 se lee de un vistazo, y una de
 * $ 50.000,25 no esconde los centavos que despues hay que pagar.
 */
const PESOS = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function pesos(valor: number): string {
  return PESOS.format(valor);
}

const PORCENTAJE = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 3 });

export function porcentaje(valor: number): string {
  return `${PORCENTAJE.format(valor)} %`;
}

/**
 * FECHAS: HAY DOS CLASES Y NO SE FORMATEAN IGUAL
 *
 * 1. Un **instante**: cuando se cargo una venta, cuando se importo un padron,
 *    cuando se anulo algo. Se guarda con `now()` y lleva hora.
 * 2. Un **dia del padron**: la emision de una cuota, su fecha de pago, la
 *    vigencia de un precio. No tienen hora; se guardan a medianoche UTC.
 *
 * Los dos se estaban mostrando con `timeZone: "UTC"`, que es lo correcto para
 * el segundo y falso para el primero: una venta cargada a las nueve de la noche
 * aparecia con la fecha del dia siguiente, y una del ultimo dia del mes caia en
 * el mes que viene. El padron tampoco toleraba lo contrario: formatear en hora
 * argentina un dia guardado a medianoche UTC lo corre un dia para atras.
 *
 * Por eso la zona va escrita y no se deja librada al servidor: Railway corre en
 * UTC, asi que un formateador sin `timeZone` muestra bien en la maquina de
 * desarrollo y mal en produccion, que es la peor forma de tener este error.
 */
export const ZONA_HORARIA = "America/Argentina/Buenos_Aires";

const DIA = new Intl.DateTimeFormat("es-AR", { timeZone: ZONA_HORARIA });

const MOMENTO = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: ZONA_HORARIA,
});

const DIA_DEL_PADRON = new Intl.DateTimeFormat("es-AR", { timeZone: "UTC" });

/** El dia de un instante, en hora de acá. */
export function dia(fecha: Date): string {
  return DIA.format(fecha);
}

/** Un instante con su hora, en hora de acá. */
export function momento(fecha: Date): string {
  return MOMENTO.format(fecha);
}

/** Un dia que viene del padron: sin hora, guardado a medianoche UTC. */
export function diaDelPadron(fecha: Date): string {
  return DIA_DEL_PADRON.format(fecha);
}
