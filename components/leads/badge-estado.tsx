import { Badge } from "@/components/ui/badge";
import { ETIQUETA_ESTADO } from "@/lib/validations/lead";
import type { LeadEstado } from "@/lib/generated/prisma/client";

const CLASES: Record<LeadEstado, string> = {
  PENDIENTE: "",
  VENDIDO: "border-emerald-600/30 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400",
  NO_VENDIDO: "text-muted-foreground",
  DEVOLUCION: "border-amber-600/30 bg-amber-600/10 text-amber-700 dark:text-amber-500",
};

export function BadgeEstado({ estado }: { estado: LeadEstado }) {
  return (
    <Badge variant={estado === "PENDIENTE" ? "secondary" : "outline"} className={CLASES[estado]}>
      {ETIQUETA_ESTADO[estado]}
    </Badge>
  );
}
