import { ETIQUETA_CAMPO } from "@/lib/validations/venta";

type Entrada = {
  id: string;
  cambios: unknown;
  autor: string;
  fecha: Date;
};

const FECHA = new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" });

function mostrar(valor: unknown): string {
  if (valor === null || valor === undefined || valor === "") return "vacío";
  if (typeof valor === "boolean") return valor ? "sí" : "no";
  return String(valor);
}

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
      {entradas.map((entrada) => {
        const cambios = (entrada.cambios ?? {}) as Record<
          string,
          { antes: unknown; despues: unknown }
        >;

        return (
          <li key={entrada.id} className="py-3 first:pt-0 last:pb-0">
            <p className="mb-1.5 text-xs text-muted-foreground">
              {entrada.autor} · {FECHA.format(entrada.fecha)}
            </p>
            <ul className="space-y-1 text-sm">
              {Object.entries(cambios)
                // El cambio de plan ya se ve en el codigo de producto; mostrar
                // ademas el id interno no le dice nada a nadie.
                .filter(([campo]) => campo !== "planId")
                .map(([campo, valor]) => (
                  <li key={campo} className="flex flex-wrap gap-x-2">
                    <span className="text-muted-foreground">
                      {ETIQUETA_CAMPO[campo] ?? campo}:
                    </span>
                    <span className="line-through opacity-60">{mostrar(valor.antes)}</span>
                    <span aria-hidden>→</span>
                    <span className="font-medium">{mostrar(valor.despues)}</span>
                  </li>
                ))}
            </ul>
          </li>
        );
      })}
    </ul>
  );
}
