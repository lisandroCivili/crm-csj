import type { ReactNode } from "react";

export function PageHeader({
  titulo,
  descripcion,
  acciones,
}: {
  titulo: string;
  descripcion?: string;
  acciones?: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-[1.75rem] font-semibold leading-tight tracking-[-0.02em]">
          {titulo}
        </h1>
        {descripcion ? (
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {descripcion}
          </p>
        ) : null}
      </div>
      {acciones ? <div className="flex shrink-0 gap-2">{acciones}</div> : null}
    </div>
  );
}
