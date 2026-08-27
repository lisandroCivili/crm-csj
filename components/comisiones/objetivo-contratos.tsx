"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";
import {
  guardarObjetivo,
  type EstadoTramoAgente,
} from "@/app/admin/comisiones/agente/escala/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function BotonGuardar() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" variant="outline" disabled={pending}>
      {pending ? "…" : "Guardar"}
    </Button>
  );
}

/**
 * Contratos por mes que pide el contrato de agencia en esta zona (Tucuman 50,
 * Salta 100). No bloquea nada: si el mes no llega, la liquidacion lo avisa y
 * calcula igual.
 */
export function ObjetivoContratos({ valor }: { valor: number }) {
  const [estado, accion] = useActionState<EstadoTramoAgente, FormData>(guardarObjetivo, {});

  useEffect(() => {
    if (estado.ok) toast.success("Objetivo actualizado.");
  }, [estado]);

  const error = estado.error ?? estado.errores?.objetivo?.[0];

  return (
    <form action={accion} className="space-y-2">
      <div className="flex items-center gap-2">
        <Input
          name="objetivo"
          type="number"
          min={0}
          required
          aria-label="Objetivo de contratos del mes"
          defaultValue={valor}
          className="h-8 w-28 tabular-nums"
        />
        <BotonGuardar />
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </form>
  );
}
