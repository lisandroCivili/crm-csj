import Image from "next/image";
import logoCsj from "@/public/logo-csj.png";
import { cn } from "@/lib/utils";

/**
 * La marca de Club San Jorge: el isotipo mas el nombre.
 *
 * El archivo viene sobre fondo blanco (sin transparencia), asi que va dentro de
 * un recuadro blanco redondeado. Eso ademas lo hace verse igual en los dos
 * lugares donde aparece: el panel lateral, que es oscuro, y el login, que sigue
 * el tema del sistema.
 *
 * El `alt` va vacio a proposito: el nombre esta escrito al lado y un lector de
 * pantalla lo diria dos veces.
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
      <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1 shadow-sm">
        <Image src={logoCsj} alt="" className="size-full object-contain" priority />
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
