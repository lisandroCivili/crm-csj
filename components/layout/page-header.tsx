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
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
        {descripcion ? (
          <p className="mt-1 text-sm text-muted-foreground">{descripcion}</p>
        ) : null}
      </div>
      {acciones ? <div className="flex gap-2">{acciones}</div> : null}
    </div>
  );
}
