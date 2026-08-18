import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * LISTADOS EN CELULAR
 *
 * Las tablas del sistema tienen entre 6 y 9 columnas: en un telefono se leen
 * de costado o no se leen. En vez de esconder columnas —que deja filas
 * mutiladas y sigue sin entrar—, cada listado muestra estas tarjetas por
 * debajo de 768px y la tabla de siempre por encima.
 *
 * Es markup duplicado a proposito: los datos ya vienen resueltos del servidor,
 * y cada medio elige que mostrar. En el escritorio, Balta compara nueve
 * columnas de un vistazo; en el celular, el vendedor necesita tres datos y un
 * boton grande.
 *
 * Se parece a las listas del dashboard (`divide-y`, nombre a la izquierda y
 * dato al costado) para no estrenar un lenguaje visual nuevo.
 */

export function ListaTarjetas({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <ul className={cn("grid gap-2 md:hidden", className)}>{children}</ul>;
}

export function TarjetaFila({
  href,
  titulo,
  lateral,
  encabezado,
  children,
  atenuada,
}: {
  /** Si viene, toda la tarjeta es tocable. */
  href?: string;
  /** Texto principal. Se puede reemplazar por `encabezado` si no alcanza. */
  titulo?: ReactNode;
  /** Arriba a la derecha: fecha, estado, importe. */
  lateral?: ReactNode;
  /** Reemplaza al titulo cuando hace falta algo mas que texto. */
  encabezado?: ReactNode;
  children?: ReactNode;
  atenuada?: boolean;
}) {
  const contenido = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {encabezado ?? <p className="truncate font-medium">{titulo}</p>}
        </div>
        {lateral ? (
          <div className="shrink-0 text-right text-xs text-muted-foreground">{lateral}</div>
        ) : null}
        {href ? (
          <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        ) : null}
      </div>
      {children ? <dl className="mt-2 grid gap-1">{children}</dl> : null}
    </>
  );

  const clases = cn(
    "block rounded-xl bg-card p-3 text-sm ring-1 ring-border",
    atenuada && "opacity-60"
  );

  return (
    <li>
      {href ? (
        <Link href={href} className={cn(clases, "active:bg-muted")}>
          {contenido}
        </Link>
      ) : (
        <div className={clases}>{contenido}</div>
      )}
    </li>
  );
}

export function DatoFila({
  etiqueta,
  valor,
}: {
  etiqueta: string;
  valor: ReactNode;
}) {
  if (valor === null || valor === undefined || valor === "") return null;

  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 text-xs text-muted-foreground">{etiqueta}</dt>
      <dd className="min-w-0 truncate text-right text-sm">{valor}</dd>
    </div>
  );
}
