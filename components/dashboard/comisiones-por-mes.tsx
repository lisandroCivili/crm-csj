import Link from "next/link";
import { etiquetaPeriodo } from "@/lib/comisiones/periodo";
import type { MesComision } from "@/lib/dashboard/graficos";
import { pasoDeRampa } from "@/lib/dashboard/rampa";
import { pesos } from "@/lib/formato";

/**
 * CUANTO PAGO EL CLUB, MES A MES
 *
 * Balta la pidio como torta. Una torta es riesgosa cuando hay que comparar
 * valores parecidos —el ojo mide mal los angulos—, asi que al lado va la lista
 * con el importe y el porcentaje de cada mes: el reparto se ve en el dibujo y
 * el numero se lee escrito, sin depender de comparar gajos.
 *
 * El color es una rampa de un solo tono y no seis colores distintos, porque los
 * meses tienen orden: el mes mas nuevo es el mas oscuro y la rampa se aclara
 * hacia atras. Los pasos se validaron contra el chequeo de daltonismo.
 *
 * Se dibuja en el servidor con un SVG y sin JavaScript, como el resto de los
 * graficos del dashboard.
 */

/** Radio de la linea media del anillo, en unidades del viewBox. */
const RADIO = 56;
const GROSOR = 18;
const CENTRO = 70;
const CIRCUNFERENCIA = 2 * Math.PI * RADIO;
/** Separacion entre gajos, en color de superficie. No es un borde: es aire. */
const SEPARACION = 3;

/** Los pasos de la rampa ordinal, definidos en globals.css. */
const RAMPA = [
  "var(--serie-1)",
  "var(--serie-2)",
  "var(--serie-3)",
  "var(--serie-4)",
  "var(--serie-5)",
  "var(--serie-6)",
];

export function ComisionesPorMes({ meses }: { meses: MesComision[] }) {
  if (meses.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Todavía no cerraste ningún mes.{" "}
        <Link href="/admin/comisiones/agente" className="underline underline-offset-2">
          Cerrá uno
        </Link>{" "}
        y va a aparecer acá.
      </p>
    );
  }

  const total = meses.reduce((suma, mes) => suma + mes.total, 0);

  if (total === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Los meses cerrados no tienen comisión cargada.
      </p>
    );
  }

  // Un solo mes se dibuja como anillo entero: una separacion en un gajo que
  // vale el 100 % seria un tajo sin significado.
  const unico = meses.filter((mes) => mes.total > 0).length === 1;

  // El desplazamiento de cada gajo se calcula sumando los anteriores en vez de
  // ir acumulando en una variable: con seis meses el costo no existe y la
  // funcion queda sin estado, que es lo que pide el compilador de React.
  const gajos = meses.map((mes, i) => {
    const parte = mes.total / total;
    const largo = parte * CIRCUNFERENCIA;
    const previo = meses.slice(0, i).reduce((suma, otro) => suma + otro.total, 0);

    return {
      ...mes,
      parte,
      color: RAMPA[pasoDeRampa(i, meses.length)],
      visible: unico ? largo : Math.max(0.5, largo - SEPARACION),
      desplazamiento: -(previo / total) * CIRCUNFERENCIA,
    };
  });

  return (
    <figure className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-6">
      <div className="relative shrink-0">
        <svg viewBox="0 0 140 140" className="size-40" role="img" aria-label="Comisión del club por mes cerrado">
          <g transform={`rotate(-90 ${CENTRO} ${CENTRO})`}>
            {gajos.map((gajo) =>
              gajo.total === 0 ? null : (
                <circle
                  key={gajo.periodo}
                  cx={CENTRO}
                  cy={CENTRO}
                  r={RADIO}
                  fill="none"
                  stroke={gajo.color}
                  strokeWidth={GROSOR}
                  strokeDasharray={`${gajo.visible} ${CIRCUNFERENCIA - gajo.visible}`}
                  strokeDashoffset={gajo.desplazamiento}
                >
                  <title>
                    {etiquetaPeriodo(gajo.periodo)}: {pesos(gajo.total)} (
                    {Math.round(gajo.parte * 100)} %)
                  </title>
                </circle>
              )
            )}
          </g>
        </svg>

        {/* El total va en el centro, con cifras proporcionales: a este tamaño
            las de ancho fijo se leen sueltas. El anillo es fino a proposito,
            para que el hueco de lugar a un importe de siete u ocho digitos sin
            que el numero se monte sobre los gajos. */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-5 text-center">
          <span className="text-[0.6rem] uppercase tracking-wide text-muted-foreground">
            Total
          </span>
          <span className="text-sm font-semibold leading-tight tracking-[-0.02em]">
            {pesos(total)}
          </span>
        </div>
      </div>

      {/* Esta lista es la leyenda y a la vez la tabla de datos: cada mes con su
          importe y su porcentaje, sin tener que medir ningún ángulo. */}
      <figcaption className="min-w-0 flex-1 self-stretch">
        <ul className="divide-y text-sm">
          {gajos.map((gajo) => (
            <li key={gajo.periodo} className="flex items-center gap-2.5 py-1.5">
              <span
                className="size-2.5 shrink-0 rounded-[3px]"
                style={{ background: gajo.color }}
              />
              {/* Solo la primera letra: `capitalize` pondria "Marzo De 2026". */}
              <span className="min-w-0 flex-1 truncate first-letter:uppercase">
                {etiquetaPeriodo(gajo.periodo)}
              </span>
              <span className="shrink-0 tabular-nums">{pesos(gajo.total)}</span>
              <span className="w-10 shrink-0 text-right tabular-nums text-muted-foreground">
                {Math.round(gajo.parte * 100)} %
              </span>
            </li>
          ))}
        </ul>
      </figcaption>
    </figure>
  );
}
