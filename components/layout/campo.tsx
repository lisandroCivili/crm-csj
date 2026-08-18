import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";

/**
 * Etiqueta + control + ayuda o error. El error tapa a la ayuda: cuando algo
 * esta mal, lo que hay que leer es el error.
 */
export function Campo({
  nombre,
  etiqueta,
  errores,
  requerido,
  children,
  ayuda,
}: {
  nombre: string;
  etiqueta: string;
  errores?: string[];
  requerido?: boolean;
  children: ReactNode;
  ayuda?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={nombre}>
        {etiqueta}
        {requerido ? <span className="text-destructive"> *</span> : null}
      </Label>
      {children}
      {ayuda && !errores?.length ? (
        <p className="text-xs text-muted-foreground">{ayuda}</p>
      ) : null}
      {errores?.length ? <p className="text-xs text-destructive">{errores[0]}</p> : null}
    </div>
  );
}
