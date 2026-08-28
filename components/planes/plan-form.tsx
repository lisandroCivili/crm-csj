"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { editarPlan, type EstadoPlan } from "@/app/admin/planes/actions";
import { Campo } from "@/components/layout/campo";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const CLASE_SELECT =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

function BotonGuardar() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Guardando…" : "Guardar cambios"}
    </Button>
  );
}

export function PlanForm({
  valores,
}: {
  valores: {
    id: string;
    codigoProducto: string;
    nombre: string;
    duracionMeses: number | null;
    activo: boolean;
  };
}) {
  const [estado, accion] = useActionState<EstadoPlan, FormData>(editarPlan, {});
  const errores = estado.errores ?? {};

  return (
    <form action={accion} className="max-w-2xl space-y-6">
      <input type="hidden" name="id" value={valores.id} />

      {estado.error ? (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertDescription>{estado.error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Campo nombre="nombre" etiqueta="Nombre" requerido errores={errores.nombre}>
            <Input
              id="nombre"
              name="nombre"
              defaultValue={valores.nombre}
              required
              autoFocus
            />
          </Campo>
        </div>

        {/* El codigo se muestra pero no se edita: es la clave con la que el
            Excel de precios encuentra el plan. */}
        <Campo
          nombre="codigoProducto"
          etiqueta="Código de producto"
          ayuda="No se edita: es con lo que la lista de precios encuentra el plan."
        >
          <Input
            id="codigoProducto"
            value={valores.codigoProducto}
            readOnly
            disabled
            className="font-mono tabular-nums"
          />
        </Campo>

        <Campo
          nombre="duracionMeses"
          etiqueta="Duración"
          errores={errores.duracionMeses}
          ayuda="En meses. Dejalo vacío si no la sabés."
        >
          <Input
            id="duracionMeses"
            name="duracionMeses"
            inputMode="numeric"
            defaultValue={valores.duracionMeses ?? ""}
          />
        </Campo>

        <Campo
          nombre="activo"
          etiqueta="Estado"
          requerido
          errores={errores.activo}
          ayuda="Un plan inactivo no aparece al cargar una venta, pero las ventas viejas lo conservan."
        >
          <select
            id="activo"
            name="activo"
            defaultValue={valores.activo ? "true" : "false"}
            className={CLASE_SELECT}
          >
            <option value="true">Activo</option>
            <option value="false">Inactivo</option>
          </select>
        </Campo>
      </div>

      <div className="flex gap-2">
        <BotonGuardar />
        <Button type="button" variant="ghost" asChild>
          <Link href="/admin/planes">Cancelar</Link>
        </Button>
      </div>
    </form>
  );
}
