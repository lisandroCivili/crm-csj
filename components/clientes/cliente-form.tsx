"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { AlertCircle, Info } from "lucide-react";
import { editarCliente, type EstadoFormulario } from "@/app/admin/clientes/actions";
import { Campo } from "@/components/layout/campo";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ValoresCliente = {
  id: string;
  dni: string;
  nombre: string;
  domicilio: string | null;
  localidad: string | null;
  codPos: string | null;
  telefono: string | null;
  email: string | null;
};

function BotonGuardar() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Guardando…" : "Guardar cambios"}
    </Button>
  );
}

export function ClienteForm({ valores }: { valores: ValoresCliente }) {
  const [estado, accion] = useActionState<EstadoFormulario, FormData>(editarCliente, {});
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

      <p className="flex items-start gap-2 rounded-md border border-dashed p-3 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0" />
        <span>
          <strong className="font-medium">Lo que corrijas le gana al padrón.</strong> Cada
          campo que cambies queda marcado y las importaciones siguientes dejan de tocarlo. El
          resto se sigue actualizando solo.
        </span>
      </p>

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

        <div className="sm:col-span-2">
          <Campo
            nombre="dni"
            etiqueta="DNI"
            ayuda="No se edita: es con lo que el padrón reconoce al cliente. Si el club lo tiene mal, hay que pedirle que lo corrija."
          >
            <Input id="dni" value={valores.dni} readOnly disabled />
          </Campo>
        </div>

        <div className="sm:col-span-2">
          <Campo nombre="domicilio" etiqueta="Domicilio" errores={errores.domicilio}>
            <Input id="domicilio" name="domicilio" defaultValue={valores.domicilio ?? ""} />
          </Campo>
        </div>

        <Campo nombre="localidad" etiqueta="Localidad" errores={errores.localidad}>
          <Input id="localidad" name="localidad" defaultValue={valores.localidad ?? ""} />
        </Campo>

        <Campo nombre="codPos" etiqueta="Código postal" errores={errores.codPos}>
          <Input id="codPos" name="codPos" defaultValue={valores.codPos ?? ""} />
        </Campo>

        <Campo
          nombre="telefono"
          etiqueta="Teléfono"
          errores={errores.telefono}
          ayuda="Se guarda tal cual se escribe: el padrón trae varios números en un mismo campo."
        >
          <Input id="telefono" name="telefono" defaultValue={valores.telefono ?? ""} />
        </Campo>

        <Campo nombre="email" etiqueta="Email" errores={errores.email}>
          <Input id="email" name="email" type="email" defaultValue={valores.email ?? ""} />
        </Campo>
      </div>

      <div className="flex gap-2">
        <BotonGuardar />
        <Button type="button" variant="ghost" asChild>
          <Link href={`/admin/clientes/${valores.id}`}>Cancelar</Link>
        </Button>
      </div>
    </form>
  );
}
