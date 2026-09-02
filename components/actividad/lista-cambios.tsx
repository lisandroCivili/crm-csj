import { ETIQUETA_CAMPO_PERSONAL } from "@/lib/padron/camposCliente";
import { ETIQUETA_CAMPO } from "@/lib/validations/venta";

/**
 * Un diff `{ campo: { antes, despues } }` dibujado como "viejo → nuevo".
 *
 * Vive aparte porque lo muestran dos pantallas: el historial de la ficha de la
 * venta y el feed de Actividad. No es casualidad que coincidan —
 * `Actividad.cambios` es una copia de `VentaHistorial.cambios`, escrita en la
 * misma transaccion— y duplicar el render haria que arreglar uno dejara al otro
 * distinto.
 *
 * Las dos tablas de etiquetas se juntan acá: el diff puede venir de una venta o
 * de una correccion de cliente, y quien lo dibuja no tiene por que saber de
 * cual. Los campos que comparten nombre (`telefono`, `localidad`) tienen la
 * misma etiqueta en las dos, asi que el orden del merge no cambia nada.
 */
const ETIQUETAS: Record<string, string> = {
  ...ETIQUETA_CAMPO_PERSONAL,
  ...ETIQUETA_CAMPO,
};

export type Cambios = Record<string, { antes: unknown; despues: unknown }>;

export function comoCambios(valor: unknown): Cambios {
  return (valor ?? {}) as Cambios;
}

function mostrar(valor: unknown): string {
  if (valor === null || valor === undefined || valor === "") return "vacío";
  if (typeof valor === "boolean") return valor ? "sí" : "no";
  return String(valor);
}

export function ListaCambios({
  cambios,
  className,
}: {
  cambios: unknown;
  className?: string;
}) {
  const entradas = Object.entries(comoCambios(cambios))
    // El cambio de plan ya se ve en el codigo de producto; mostrar ademas el id
    // interno no le dice nada a nadie.
    .filter(([campo]) => campo !== "planId");

  if (entradas.length === 0) return null;

  return (
    <ul className={className ?? "space-y-1 text-sm"}>
      {entradas.map(([campo, valor]) => (
        <li key={campo} className="flex flex-wrap gap-x-2">
          <span className="text-muted-foreground">{ETIQUETAS[campo] ?? campo}:</span>
          <span className="line-through opacity-60">{mostrar(valor.antes)}</span>
          <span aria-hidden>→</span>
          <span className="font-medium">{mostrar(valor.despues)}</span>
        </li>
      ))}
    </ul>
  );
}
