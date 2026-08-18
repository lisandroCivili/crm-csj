"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle } from "lucide-react";
import { cambiarPassword, type EstadoPerfil } from "@/app/perfil/actions";
import { Campo } from "@/components/layout/campo";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PASSWORD_MIN } from "@/lib/validations/comunes";

function BotonCambiar() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Cambiando…" : "Cambiar contraseña"}
    </Button>
  );
}

export function FormPassword() {
  const [estado, accion] = useActionState<EstadoPerfil, FormData>(cambiarPassword, {});
  const errores = estado.errores ?? {};

  return (
    <form action={accion} className="space-y-5">
      {estado.error ? (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertDescription>{estado.error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Campo
            nombre="passwordActual"
            etiqueta="Contraseña actual"
            requerido
            errores={errores.passwordActual}
          >
            <Input
              id="passwordActual"
              name="passwordActual"
              type="password"
              autoComplete="current-password"
              required
            />
          </Campo>
        </div>

        <Campo
          nombre="password"
          etiqueta="Contraseña nueva"
          requerido
          errores={errores.password}
          ayuda={`Mínimo ${PASSWORD_MIN} caracteres.`}
        >
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={PASSWORD_MIN}
            required
          />
        </Campo>

        <Campo
          nombre="passwordConfirmacion"
          etiqueta="Repetila"
          requerido
          errores={errores.passwordConfirmacion}
        >
          <Input
            id="passwordConfirmacion"
            name="passwordConfirmacion"
            type="password"
            autoComplete="new-password"
            minLength={PASSWORD_MIN}
            required
          />
        </Campo>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <BotonCambiar />
        <p className="text-xs text-muted-foreground">
          Al cambiarla se cierra la sesión y entrás de nuevo con la nueva.
        </p>
      </div>
    </form>
  );
}
