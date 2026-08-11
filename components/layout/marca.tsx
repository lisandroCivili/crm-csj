import { cn } from "@/lib/utils";

/**
 * Monograma de Club San Jorge. Los cuatro colores de la marca aparecen juntos
 * aca: el cuadro negro, el rojo y el verde en la barra inferior, y el blanco
 * del texto.
 */
export function Marca({
  bajada,
  className,
  invertido,
}: {
  bajada?: string;
  className?: string;
  /** Para fondos oscuros (el panel lateral). */
  invertido?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary text-[0.68rem] font-bold tracking-tight text-primary-foreground shadow-sm">
        CSJ
        <span className="absolute inset-x-0 bottom-0 h-[3px] bg-success" />
      </span>
      <span className="min-w-0">
        <span
          className={cn(
            "block truncate text-sm font-semibold leading-tight",
            invertido && "text-white"
          )}
        >
          Club San Jorge
        </span>
        {bajada ? (
          <span
            className={cn(
              "block truncate text-xs",
              invertido ? "text-white/55" : "text-muted-foreground"
            )}
          >
            {bajada}
          </span>
        ) : null}
      </span>
    </div>
  );
}
