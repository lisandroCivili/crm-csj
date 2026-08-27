import { Badge } from "@/components/ui/badge";
import type { EstadoCaidaCliente } from "@/lib/padron/caidas";
import { IMPAGAS_PARA_CAIDA } from "@/lib/padron/caidas";

/**
 * ESTADO DE CAIDA EN PANTALLA
 *
 * Tres colores y no dos, porque hay tres cosas distintas que decir y mezclarlas
 * es lo que haria inutil el dato:
 *
 *   - rojo: esta caido, consta,
 *   - ambar: todavia no, pero se esta yendo,
 *   - gris: el sistema no sabe. No es "esta al dia": es que le falta historico.
 *
 * El gris es el que importa cuidar. Un titulo con un hueco en la numeracion
 * mostrado como si estuviera al dia haria que Balta no lo llame; mostrado como
 * caido lo haria llamar a alguien que viene pagando.
 */

const AMBAR = "border-amber-500/40 text-amber-700 dark:text-amber-500";

const CLIENTE: Record<
  Exclude<EstadoCaidaCliente, "AL_DIA">,
  { texto: string; variant: "destructive" | "outline"; clase?: string }
> = {
  TOTAL: { texto: "caída total", variant: "destructive" },
  PARCIAL: { texto: "caída parcial", variant: "outline", clase: AMBAR },
  RIESGO: { texto: "en riesgo", variant: "outline", clase: AMBAR },
};

/** El estado del cliente: parcial cuando solo algunos de sus titulos cayeron. */
export function BadgeCaidaCliente({ estado }: { estado: EstadoCaidaCliente }) {
  if (estado === "AL_DIA") return null;

  const { texto, variant, clase } = CLIENTE[estado];
  return (
    <Badge variant={variant} className={clase}>
      {texto}
    </Badge>
  );
}

export type EstadoTituloCaida = {
  impagasConsecutivas: number;
  caidoAt: Date | null;
  caidaConfiable: boolean;
};

/**
 * El estado de un titulo puntual. Muestra la cantidad de impagas porque es el
 * numero que Balta va a querer decirle al cliente por telefono.
 */
export function BadgeCaidaTitulo({ titulo }: { titulo: EstadoTituloCaida }) {
  const { impagasConsecutivas: impagas, caidoAt, caidaConfiable } = titulo;

  if (caidoAt) {
    return <Badge variant="destructive">caído · {impagas} impagas seguidas</Badge>;
  }

  if (!caidaConfiable) {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        sin datos suficientes
      </Badge>
    );
  }

  if (impagas === 0) return null;

  return (
    <Badge variant="outline" className={AMBAR}>
      {impagas} impaga{impagas === 1 ? "" : "s"} seguida{impagas === 1 ? "" : "s"} de{" "}
      {IMPAGAS_PARA_CAIDA}
    </Badge>
  );
}
