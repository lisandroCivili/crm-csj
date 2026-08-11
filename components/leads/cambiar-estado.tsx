"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";
import { cambiarEstadoLead, type EstadoCambio } from "@/app/admin/leads/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ESTADOS_LEAD, ETIQUETA_ESTADO } from "@/lib/validations/lead";
import type { LeadEstado } from "@/lib/generated/prisma/client";

function BotonGuardar() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Guardando…" : "Guardar"}
    </Button>
  );
}

export function CambiarEstadoLead({
  leadId,
  estadoActual,
  motivoActual,
}: {
  leadId: string;
  estadoActual: LeadEstado;
  motivoActual: string | null;
}) {
  const [estado, accion] = useActionState<EstadoCambio, FormData>(cambiarEstadoLead, {});
  const [elegido, setElegido] = useState<LeadEstado>(estadoActual);

  useEffect(() => {
    if (estado.ok) toast.success("Estado actualizado.");
  }, [estado]);

  return (
    <form action={accion} className="space-y-4">
      <input type="hidden" name="leadId" value={leadId} />

      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-medium">Estado</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {ESTADOS_LEAD.map((valor) => (
            <label
              key={valor}
              className={`flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm ${
                elegido === valor ? "border-primary bg-accent/50" : ""
              }`}
            >
              <input
                type="radio"
                name="estado"
                value={valor}
                checked={elegido === valor}
                onChange={() => setElegido(valor)}
              />
              {ETIQUETA_ESTADO[valor]}
            </label>
          ))}
        </div>
      </fieldset>

      {elegido === "DEVOLUCION" ? (
        <div className="space-y-2">
          <Label htmlFor="motivoDevolucion">¿Por qué lo devolvés?</Label>
          <Textarea
            id="motivoDevolucion"
            name="motivoDevolucion"
            rows={3}
            defaultValue={motivoActual ?? ""}
            placeholder="Ej: el teléfono no existe, no le interesa, ya es cliente…"
            required
          />
          <p className="text-xs text-muted-foreground">
            El lead vuelve a quedar sin asignar para que lo reasignen.
          </p>
        </div>
      ) : null}

      {estado.error ? (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertDescription>{estado.error}</AlertDescription>
        </Alert>
      ) : null}

      <BotonGuardar />
    </form>
  );
}
