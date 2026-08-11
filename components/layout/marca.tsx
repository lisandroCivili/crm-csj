import { cn } from "@/lib/utils";

/**
 * Monograma de Club San Jorge. Es el unico lugar donde el rojo de marca ocupa
 * una superficie llena: en el resto de la interfaz aparece en botones, foco y
 * acentos, para que no compita con los datos.
 */
export function Marca({
  bajada,
  className,
}: {
  bajada?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-[0.7rem] font-bold tracking-tight text-primary-foreground">
        CSJ
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold leading-tight">
          Club San Jorge
        </span>
        {bajada ? (
          <span className="block truncate text-xs text-muted-foreground">{bajada}</span>
        ) : null}
      </span>
    </div>
  );
}
