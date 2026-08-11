"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { crearVendedor, editarVendedor, type EstadoFormulario } from "@/app/admin/vendedores/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type ValoresVendedor = {
  id?: string;
  nombreCompleto?: string;
  dni?: string;
  codigo?: string;
  direccion?: string | null;
  email?: string | null;
  telefono?: string | null;
  topeCuotasComision?: number;
  condiciones?: string | null;
};

function Campo({
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
  children: React.ReactNode;
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
      {errores?.length ? (
        <p className="text-xs text-destructive">{errores[0]}</p>
      ) : null}
    </div>
  );
}

function BotonGuardar({ edicion }: { edicion: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Guardando…" : edicion ? "Guardar cambios" : "Crear vendedor"}
    </Button>
  );
}

export function VendedorForm({ valores }: { valores?: ValoresVendedor }) {
  const edicion = Boolean(valores?.id);
  const [estado, accion] = useActionState<EstadoFormulario, FormData>(
    edicion ? editarVendedor : crearVendedor,
    {}
  );
  const errores = estado.errores ?? {};

  return (
    <form action={accion} className="max-w-2xl space-y-6">
      {edicion ? <input type="hidden" name="id" value={valores?.id} /> : null}

      {estado.error ? (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertDescription>{estado.error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Campo nombre="nombreCompleto" etiqueta="Nombre completo" requerido errores={errores.nombreCompleto}>
            <Input
              id="nombreCompleto"
              name="nombreCompleto"
              defaultValue={valores?.nombreCompleto ?? ""}
              required
              autoFocus
            />
          </Campo>
        </div>

        <Campo nombre="dni" etiqueta="DNI" requerido errores={errores.dni} ayuda="Solo números, sin puntos.">
          <Input
            id="dni"
            name="dni"
            inputMode="numeric"
            defaultValue={valores?.dni ?? ""}
            required
          />
        </Campo>

        <Campo
          nombre="codigo"
          etiqueta="Código"
          requerido
          errores={errores.codigo}
          ayuda="Código con el que lo identifica el club."
        >
          <Input id="codigo" name="codigo" defaultValue={valores?.codigo ?? ""} required />
        </Campo>

        <Campo nombre="email" etiqueta="Email" errores={errores.email}>
          <Input id="email" name="email" type="email" defaultValue={valores?.email ?? ""} />
        </Campo>

        <Campo nombre="telefono" etiqueta="Teléfono" errores={errores.telefono}>
          <Input id="telefono" name="telefono" defaultValue={valores?.telefono ?? ""} />
        </Campo>

        <div className="sm:col-span-2">
          <Campo nombre="direccion" etiqueta="Dirección" errores={errores.direccion}>
            <Input id="direccion" name="direccion" defaultValue={valores?.direccion ?? ""} />
          </Campo>
        </div>

        <Campo
          nombre="topeCuotasComision"
          etiqueta="Cobra comisión hasta la cuota"
          requerido
          errores={errores.topeCuotasComision}
          ayuda="De c1 a c5, según lo que se acuerde con el vendedor."
        >
          <select
            id="topeCuotasComision"
            name="topeCuotasComision"
            defaultValue={String(valores?.topeCuotasComision ?? 4)}
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                c{n}
              </option>
            ))}
          </select>
        </Campo>

        <div className="sm:col-span-2">
          <Campo
            nombre="condiciones"
            etiqueta="Condiciones"
            errores={errores.condiciones}
            ayuda="Acuerdos particulares con este vendedor."
          >
            <Textarea
              id="condiciones"
              name="condiciones"
              rows={4}
              defaultValue={valores?.condiciones ?? ""}
            />
          </Campo>
        </div>
      </div>

      <div className="flex gap-2">
        <BotonGuardar edicion={edicion} />
        <Button type="button" variant="ghost" asChild>
          <Link href={edicion ? `/admin/vendedores/${valores?.id}` : "/admin/vendedores"}>
            Cancelar
          </Link>
        </Button>
      </div>
    </form>
  );
}
