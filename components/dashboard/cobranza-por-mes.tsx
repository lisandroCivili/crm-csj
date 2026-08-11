const MES = new Intl.DateTimeFormat("es-AR", { month: "short", timeZone: "UTC" });

export type MesCobranza = {
  periodo: Date;
  total: number;
  pagas: number;
};

/**
 * Cuanto se cobro de lo emitido, mes a mes.
 *
 * Una sola serie lleva color (lo cobrado, en verde) sobre un riel neutro con el
 * resto. Con dos colores parecidos el grafico se vuelve ilegible para quien
 * tiene daltonismo protan; con relleno contra riel, el porcentaje se entiende
 * por la altura y ademas va escrito, asi que no depende del color.
 */
export function CobranzaPorMes({ meses }: { meses: MesCobranza[] }) {
  if (meses.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Todavía no hay cuotas cargadas. Importá un padrón.
      </p>
    );
  }

  return (
    <figure>
      <figcaption className="mb-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px] bg-success" />
          Cobradas
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px] bg-muted ring-1 ring-border" />
          Impagas
        </span>
      </figcaption>

      <div className="flex items-end gap-2 sm:gap-3">
        {meses.map((mes) => {
          const porcentaje = mes.total > 0 ? Math.round((mes.pagas / mes.total) * 100) : 0;
          const impagas = mes.total - mes.pagas;

          return (
            <div key={mes.periodo.toISOString()} className="flex min-w-0 flex-1 flex-col items-center">
              <span className="mb-1.5 text-xs font-medium tabular-nums">{porcentaje}%</span>

              <div
                className="flex h-36 w-full flex-col justify-end overflow-hidden rounded-lg bg-muted"
                title={`${MES.format(mes.periodo)}: ${mes.pagas} cobradas de ${mes.total} (${impagas} impagas)`}
              >
                {/* Sin altura minima: un mes sin cobrar nada tiene que verse
                    vacio, no con una franja verde que sugiere lo contrario. */}
                {porcentaje > 0 ? (
                  <div
                    className="w-full rounded-lg bg-success"
                    style={{ height: `${porcentaje}%` }}
                  />
                ) : null}
              </div>

              <span className="mt-2 truncate text-xs capitalize text-muted-foreground">
                {MES.format(mes.periodo).replace(".", "")}
              </span>
              <span className="text-[0.7rem] tabular-nums text-muted-foreground/70">
                {mes.pagas}/{mes.total}
              </span>
            </div>
          );
        })}
      </div>
    </figure>
  );
}
