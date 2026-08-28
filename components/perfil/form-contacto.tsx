"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";
import { actualizarContacto, type EstadoPerfil } from "@/app/perfil/actions";
import { Campo } from "@/components/layout/campo";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function BotonGuardar() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Guardando…" : "Guardar cambios"}
    </Button>
  );
}

export function FormContacto({
  esAdmin,
  valores,
}: {
  esAdmin: boolean;
  valores: {
    nombre: string;
    telefono: string | null;
    codigoAgente: string | null;
    email: string | null;
    direccion: string | null;
  };
}) {
  const [estado, accion] = useActionState<EstadoPerfil, FormData>(actualizarContacto, {});
  const errores = estado.errores ?? {};

  useEffect(() => {
    if (estado.ok) toast.success("Datos actualizados.");
  }, [estado]);

  return (
    <form action={accion} className="space-y-5">
      {estado.error ? (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertDescription>{estado.error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        {esAdmin ? (
          <div className="sm:col-span-2">
            <Campo
              nombre="nombre"
              etiqueta="Nombre"
              requerido
              errores={errores.nombre}
              ayuda="Es el nombre con el que te saluda el sistema."
            >
              <Input id="nombre" name="nombre" defaultValue={valores.nombre} required />
            </Campo>
          </div>
        ) : null}

        <Campo nombre="telefono" etiqueta="Teléfono" errores={errores.telefono}>
          <Input
            id="telefono"
            name="telefono"
            inputMode="tel"
            defaultValue={valores.telefono ?? ""}
          />
        </Campo>

        {esAdmin ? (
          <Campo
            nombre="codigoAgente"
            etiqueta="Código de agente"
            errores={errores.codigoAgente}
            ayuda="El que te dio el club. No es el código de vendedor."
          >
            <Input
              id="codigoAgente"
              name="codigoAgente"
              defaultValue={valores.codigoAgente ?? ""}
            />
          </Campo>
        ) : null}

        {!esAdmin ? (
          <>
            <Campo
              nombre="email"
              etiqueta="Email de contacto"
              errores={errores.email}
              ayuda="No es el de ingreso: este es el que figura en tu ficha."
            >
              <Input id="email" name="email" type="email" defaultValue={valores.email ?? ""} />
            </Campo>

            <div className="sm:col-span-2">
              <Campo nombre="direccion" etiqueta="Dirección" errores={errores.direccion}>
                <Input
                  id="direccion"
                  name="direccion"
                  defaultValue={valores.direccion ?? ""}
                />
              </Campo>
            </div>
          </>
        ) : null}
      </div>

      <BotonGuardar />
    </form>
  );
}
