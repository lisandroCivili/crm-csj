/**
 * Un periodo de comision es un mes calendario y se escribe `YYYY-MM`.
 *
 * Todo el sistema trabaja las fechas en UTC (el padron trae fechas sin hora y
 * Postgres las guarda a medianoche UTC), asi que los rangos tambien se arman
 * en UTC: usar la zona local correria el limite del mes unas horas y dejaria
 * cuotas del dia 1 o del 31 en el periodo equivocado.
 */

const FORMATO = /^(\d{4})-(\d{2})$/;

export type RangoPeriodo = { desde: Date; hasta: Date };

export function esPeriodoValido(periodo: string): boolean {
  const partes = FORMATO.exec(periodo);
  if (!partes) return false;
  const mes = Number(partes[2]);
  return mes >= 1 && mes <= 12;
}

/** Rango semiabierto [desde, hasta) que cubre el mes del periodo. */
export function rangoDelPeriodo(periodo: string): RangoPeriodo {
  const partes = FORMATO.exec(periodo);
  if (!partes) throw new Error(`Periodo invalido: "${periodo}". Se espera YYYY-MM.`);

  const anio = Number(partes[1]);
  const mes = Number(partes[2]);
  if (mes < 1 || mes > 12) throw new Error(`Periodo invalido: "${periodo}".`);

  return {
    desde: new Date(Date.UTC(anio, mes - 1, 1)),
    hasta: new Date(Date.UTC(anio, mes, 1)),
  };
}

export function periodoDeFecha(fecha: Date): string {
  const anio = fecha.getUTCFullYear();
  const mes = String(fecha.getUTCMonth() + 1).padStart(2, "0");
  return `${anio}-${mes}`;
}

export function periodoActual(): string {
  return periodoDeFecha(new Date());
}

/** Corre `cantidad` meses hacia atras (o adelante si es negativo). */
export function periodoAnterior(periodo: string, cantidad = 1): string {
  const { desde } = rangoDelPeriodo(periodo);
  return periodoDeFecha(
    new Date(Date.UTC(desde.getUTCFullYear(), desde.getUTCMonth() - cantidad, 1))
  );
}

/** Los `cantidad` periodos que terminan en `hasta`, del mas viejo al mas nuevo. */
export function ultimosPeriodos(hasta: string, cantidad: number): string[] {
  const lista: string[] = [];
  for (let i = cantidad - 1; i >= 0; i--) lista.push(periodoAnterior(hasta, i));
  return lista;
}

const ETIQUETA = new Intl.DateTimeFormat("es-AR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** "agosto de 2026", para mostrar en pantalla. */
export function etiquetaPeriodo(periodo: string): string {
  return ETIQUETA.format(rangoDelPeriodo(periodo).desde);
}
