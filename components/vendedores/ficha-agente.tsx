"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, Link2, Link2Off, ShieldCheck } from "lucide-react";
import {
  desvincularFichaDeAdmin,
  vincularFichaAAdmin,
  type EstadoFormulario,
} from "@/app/admin/vendedores/actions";
import { Campo } from "@/components/layout/campo";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type AdminOpcion = { id: string; nombre: string; email: string };

function BotonEnlazar() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      <Link2 className="size-4" />
      {pending ? "Enlazando…" : "Enlazar"}
    </Button>
  );
}

/**
 * Enlaza esta ficha de vendedor con la cuenta de administracion de Balta o
 * Pedro. Es lo que hace que su produccion propia del padron caiga en una
 * liquidacion a su nombre, sin crearles una segunda cuenta con la que entrar.
 */
export function FichaAgente({
  vendedorId,
  admins,
  enlazadoA,
}: {
  vendedorId: string;
  /** Admins sin ficha en esta zona. Vacio cuando ya la tienen todos. */
  admins: AdminOpcion[];
  /** Nombre del admin al que ya esta enlazada, si lo esta. */
  enlazadoA?: string;
}) {
  const [estado, accion] = useActionState<EstadoFormulario, FormData>(
    vincularFichaAAdmin,
    {}
  );

  if (enlazadoA) {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="gap-1.5">
            <ShieldCheck className="size-3" />
            {enlazadoA}
          </Badge>
          <span className="text-sm text-muted-foreground">entra con su cuenta de admin</span>
        </div>

        <p className="text-xs leading-relaxed text-muted-foreground">
          Los títulos del padrón que caigan en esta ficha se le liquidan como vendedor, y en
          su dashboard ve la comisión que le corresponde.
        </p>

        <form action={desvincularFichaDeAdmin}>
          <input type="hidden" name="vendedorId" value={vendedorId} />
          <Button type="submit" variant="ghost" size="sm">
            <Link2Off className="size-4" />
            Desenlazar
          </Button>
        </form>
      </div>
    );
  }

  if (admins.length === 0) return null;

  return (
    <form action={accion} className="space-y-3">
      <input type="hidden" name="vendedorId" value={vendedorId} />

      {estado.error ? (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertDescription>{estado.error}</AlertDescription>
        </Alert>
      ) : null}

      <Campo
        nombre="userId"
        etiqueta="Es la ficha de un administrador"
        ayuda="Balta y Pedro venden además de administrar. Enlazá su ficha para que su producción se les liquide."
      >
        <select
          id="userId"
          name="userId"
          required
          defaultValue=""
          className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <option value="">— elegir cuenta —</option>
          {admins.map((admin) => (
            <option key={admin.id} value={admin.id}>
              {admin.nombre} · {admin.email}
            </option>
          ))}
        </select>
      </Campo>

      <BotonEnlazar />
    </form>
  );
}
