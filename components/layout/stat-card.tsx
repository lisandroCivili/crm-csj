import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Tono = "neutro" | "marca" | "exito" | "atencion";

const TONOS: Record<Tono, string> = {
  neutro: "bg-muted text-muted-foreground",
  marca: "bg-brand-muted text-primary",
  exito: "bg-success-muted text-success",
  atencion: "bg-warning-muted text-warning",
};

export function StatCard({
  etiqueta,
  valor,
  detalle,
  icono: Icono,
  tono = "neutro",
  href,
}: {
  etiqueta: string;
  valor: number | string;
  detalle?: string;
  icono: LucideIcon;
  tono?: Tono;
  href?: string;
}) {
  const contenido = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{etiqueta}</p>
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-xl",
            TONOS[tono]
          )}
        >
          <Icono className="size-[1.05rem]" />
        </span>
      </div>

      <p className="mt-3 text-3xl font-semibold tracking-[-0.02em] tabular-nums">
        {typeof valor === "number" ? valor.toLocaleString("es-AR") : valor}
      </p>

      {detalle ? (
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{detalle}</p>
      ) : null}
    </>
  );

  const clases =
    "rounded-2xl bg-card p-5 ring-1 ring-border shadow-[0_1px_2px_rgba(16,12,12,0.04),0_4px_16px_-4px_rgba(16,12,12,0.06)]";

  if (href) {
    return (
      <Link
        href={href}
        className={cn(clases, "block transition-shadow hover:ring-primary/30")}
      >
        {contenido}
      </Link>
    );
  }

  return <div className={clases}>{contenido}</div>;
}
