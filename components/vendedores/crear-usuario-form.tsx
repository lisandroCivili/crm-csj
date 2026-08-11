"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";
import {
  crearUsuarioVendedor,
  type EstadoFormulario,
} from "@/app/admin/vendedores/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function BotonCrear() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Creando…" : "Crear cuenta"}
    </Button>
  );
}

export function CrearUsuarioForm({
  vendedorId,
  emailSugerido,
}: {
  vendedorId: string;
  emailSugerido: string | null;
}) {
  const [estado, accion] = useActionState<EstadoFormulario, FormData>(
    crearUsuarioVendedor,
    {}
  );
  const formRef = useRef<HTMLFormElement>(null);
  const yaAvisado = useRef(false);

  // Estado vacio (sin error ni errores de campo) = se creo bien.
  const exito = Boolean(estado) && !estado.error && !estado.errores;

  useEffect(() => {
    if (exito && !yaAvisado.current) {
      yaAvisado.current = true;
      toast.success("Cuenta creada. Ya puede ingresar al sistema.");
      formRef.current?.reset();
    }
  }, [exito]);

  return (
    <form ref={formRef} action={accion} className="space-y-4">
      <input type="hidden" name="vendedorId" value={vendedorId} />

      {estado.error ? (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertDescription>{estado.error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="email-cuenta">Email de ingreso</Label>
          <Input
            id="email-cuenta"
            name="email"
            type="email"
            defaultValue={emailSugerido ?? ""}
            required
          />
          {estado.errores?.email ? (
            <p className="text-xs text-destructive">{estado.errores.email[0]}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password-cuenta">Contraseña inicial</Label>
          <Input
            id="password-cuenta"
            name="password"
            type="password"
            minLength={8}
            required
          />
          {estado.errores?.password ? (
            <p className="text-xs text-destructive">{estado.errores.password[0]}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Mínimo 8 caracteres. Pasásela al vendedor para el primer ingreso.
            </p>
          )}
        </div>
      </div>

      <BotonCrear />
    </form>
  );
}
