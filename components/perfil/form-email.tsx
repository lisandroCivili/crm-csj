"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";
import { cambiarEmail, type EstadoPerfil } from "@/app/perfil/actions";
import { Campo } from "@/components/layout/campo";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function BotonCambiar() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="outline" disabled={pending}>
      {pending ? "Cambiando…" : "Cambiar email"}
    </Button>
  );
}

export function FormEmail({ email }: { email: string }) {
  const [estado, accion] = useActionState<EstadoPerfil, FormData>(cambiarEmail, {});
  const formRef = useRef<HTMLFormElement>(null);
  const errores = estado.errores ?? {};

  useEffect(() => {
    if (!estado.ok) return;
    toast.success("Email actualizado. Es el que vas a usar para entrar.");
    formRef.current?.reset();
  }, [estado]);

  return (
    <form ref={formRef} action={accion} className="space-y-5">
      {estado.error ? (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertDescription>{estado.error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          nombre="emailIngreso"
          etiqueta="Email nuevo"
          requerido
          errores={errores.email}
          ayuda={`Hoy entrás con ${email}.`}
        >
          <Input id="emailIngreso" name="email" type="email" autoComplete="username" required />
        </Campo>

        <Campo
          nombre="passwordActualEmail"
          etiqueta="Tu contraseña"
          requerido
          errores={errores.passwordActual}
          ayuda="Para confirmar que sos vos."
        >
          <Input
            id="passwordActualEmail"
            name="passwordActual"
            type="password"
            autoComplete="current-password"
            required
          />
        </Campo>
      </div>

      <BotonCambiar />
    </form>
  );
}
