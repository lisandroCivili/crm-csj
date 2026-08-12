import Link from "next/link";
import { CUOTAS_COMISIONABLES } from "@/lib/comisiones/constantes";
import { cn } from "@/lib/utils";

/**
 * Filtra el tablero por numero de cuota. Sirve para mirar la cobranza de las
 * cuotas que comisionan (c1 a c5) por separado: la cuota 1 es la venta nueva y
 * se cobra distinto que las que vienen arrastradas.
 *
 * Es navegacion pura, sin JavaScript: cada opcion es un link con ?cuota=.
 */
export function FiltroCuota({ base, activa }: { base: string; activa: number | null }) {
  const opciones: { etiqueta: string; valor: number | null }[] = [
    { etiqueta: "Todas", valor: null },
    ...CUOTAS_COMISIONABLES.map((numero) => ({ etiqueta: `c${numero}`, valor: numero })),
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted-foreground">Cuota:</span>
      <div className="flex flex-wrap gap-1">
        {opciones.map((opcion) => {
          const seleccionada = opcion.valor === activa;
          const href = opcion.valor === null ? base : `${base}?cuota=${opcion.valor}`;

          return (
            <Link
              key={opcion.etiqueta}
              href={href}
              aria-current={seleccionada ? "true" : undefined}
              className={cn(
                "rounded-full px-3 py-1 text-sm ring-1 transition-colors",
                seleccionada
                  ? "bg-primary text-primary-foreground ring-primary"
                  : "text-muted-foreground ring-border hover:bg-accent hover:text-foreground"
              )}
            >
              {opcion.etiqueta}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
