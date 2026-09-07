import { ListaCambios } from "@/components/actividad/lista-cambios";
import { momento } from "@/lib/formato";

type Entrada = {
  id: string;
  cambios: unknown;
  autor: string;
  fecha: Date;
};


export function HistorialVenta({ entradas }: { entradas: Entrada[] }) {
  if (entradas.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        La venta no se editó desde que se cargó.
      </p>
    );
  }

  return (
    <ul className="divide-y">
      {entradas.map((entrada) => (
        <li key={entrada.id} className="py-3 first:pt-0 last:pb-0">
          <p className="mb-1.5 text-xs text-muted-foreground">
            {entrada.autor} · {momento(entrada.fecha)}
          </p>
          {/* El mismo render que usa el feed de Actividad: las dos pantallas
              muestran el mismo diff. */}
          <ListaCambios cambios={entrada.cambios} />
        </li>
      ))}
    </ul>
  );
}
