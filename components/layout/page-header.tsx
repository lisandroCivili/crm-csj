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
      {/* `flex-wrap` y no `shrink-0`: en Comisiones son tres botones que suman
          458px y en el telefono hay 390. Con `shrink-0` la caja no cedia y
          corria toda la pagina en horizontal; asi los botones bajan de renglon
          en vez de empujar. */}
      {acciones ? <div className="flex flex-wrap gap-2">{acciones}</div> : null}
    </div>
  );
}
