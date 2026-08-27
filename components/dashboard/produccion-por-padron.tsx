import type { ProduccionPadron } from "@/lib/dashboard/graficos";

/**
 * TITULOS NUEVOS EN CADA PADRON, PARTIDOS EN VENTA NUEVA Y RENOVACION
 *
 * Es la diferencia de produccion entre archivos: de un padron al siguiente,
 * cuantos titulos entraron y de donde vinieron. Sale de las cifras que la
 * importacion ya guarda en `PadronImport` (Fase 2).
 *
 * Dos colores, no rojo y verde: el chequeo de daltonismo los da a un delta E de
 * 4,9 bajo deuteranopia, o sea indistinguibles. El par que se usa es
 * chart-1 con chart-4, que pasa en claro y en oscuro.
 *
 * La linea base es el caso que hay que mirar: ahi el desglose no existe —no
 * habia padron anterior contra el cual comparar—, asi que la barra va gris y
 * dice "sin comparación". Pintarla como 0 ventas y 0 renovaciones estaria
 * diciendo que ese mes no se vendio nada, que es distinto de no saberlo.
 */

const MES = new Intl.DateTimeFormat("es-AR", { month: "short", timeZone: "UTC" });

export function ProduccionPorPadron({ padrones }: { padrones: ProduccionPadron[] }) {
  if (padrones.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Todavía no importaste ningún padrón.
      </p>
    );
  }

  const alturaDe = (padron: ProduccionPadron) =>
    padron.esLineaBase ? padron.titulosNuevos : padron.ventasNuevas + padron.renovaciones;

  const techo = Math.max(...padrones.map(alturaDe), 1);
  const hayLineaBase = padrones.some((padron) => padron.esLineaBase);

  return (
    <figure>
      <figcaption className="mb-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px] bg-chart-1" />
          Ventas nuevas
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px] bg-chart-4" />
          Renovaciones
        </span>
        {hayLineaBase ? (
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-[3px] bg-muted ring-1 ring-border" />
            Sin comparación
          </span>
        ) : null}
      </figcaption>

      <div className="flex items-end gap-2 sm:gap-3">
        {padrones.map((padron) => {
          const total = alturaDe(padron);
          const ventas = (padron.ventasNuevas / techo) * 100;
          const renovaciones = (padron.renovaciones / techo) * 100;
          const base = (padron.titulosNuevos / techo) * 100;

          const detalle = padron.esLineaBase
            ? `${padron.archivoNombre}: ${padron.titulosNuevos} títulos, primer padrón de la zona (no se puede saber cuáles eran ventas)`
            : `${padron.archivoNombre}: ${padron.ventasNuevas} venta(s) nueva(s) y ${padron.renovaciones} renovación(es)`;

          return (
            <div key={padron.id} className="flex min-w-0 flex-1 flex-col items-center">
              <span className="mb-1.5 text-xs font-medium tabular-nums">{total}</span>

              <div
                className="flex h-36 w-full flex-col items-center justify-end"
                title={detalle}
              >
                {/* `h-full` no es decorativo: sin un alto definido en este
                    contenedor, el `height: %` de cada tramo se resuelve contra
                    un alto automatico y da cero, o sea que la barra no se
                    dibuja. */}
                <div className="flex h-full w-full max-w-6 flex-col justify-end gap-[2px]">
                  {padron.esLineaBase ? (
                    base > 0 ? (
                      <div
                        className="w-full rounded-t-[4px] bg-muted ring-1 ring-inset ring-border"
                        style={{ height: `${base}%` }}
                      />
                    ) : null
                  ) : (
                    <>
                      {renovaciones > 0 ? (
                        <div
                          className="w-full rounded-t-[4px] bg-chart-4"
                          style={{ height: `${renovaciones}%` }}
                        />
                      ) : null}
                      {ventas > 0 ? (
                        <div
                          className={`w-full bg-chart-1 ${
                            renovaciones > 0 ? "" : "rounded-t-[4px]"
                          }`}
                          style={{ height: `${ventas}%` }}
                        />
                      ) : null}
                    </>
                  )}
                </div>
              </div>

              <span className="mt-2 truncate text-xs capitalize text-muted-foreground">
                {MES.format(padron.fecha).replace(".", "")}
              </span>
              <span className="text-[0.7rem] tabular-nums text-muted-foreground/70">
                {padron.esLineaBase ? "base" : `${padron.ventasNuevas}/${padron.renovaciones}`}
              </span>
            </div>
          );
        })}
      </div>
    </figure>
  );
}
