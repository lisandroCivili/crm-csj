"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle } from "lucide-react";
import { login, type EstadoLogin } from "@/app/login/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function BotonIngresar() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Ingresando…" : "Ingresar"}
    </Button>
  );
}

export function LoginForm({ volverA }: { volverA: string }) {
  const [estado, accion] = useActionState<EstadoLogin, FormData>(login, {});

  return (
    <form action={accion} className="space-y-4">
      <input type="hidden" name="volverA" value={volverA} />

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          autoFocus
          placeholder="balta@crm-csj.local"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Contraseña</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>

      {estado.error ? (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertDescription>{estado.error}</AlertDescription>
        </Alert>
      ) : null}

      <BotonIngresar />
    </form>
  );
}
