"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
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

/**
 * Alta de la cuenta con la que el vendedor entra al sistema.
 *
 * No avisa con un toast, y no es un olvido. Habia uno, y salia mal en los dos
 * sentidos: aparecia al montar el componente --o sea cada vez que se abria la
 * ficha de un vendedor sin cuenta, sin que nadie hubiera creado nada-- porque
 * daba por exito cualquier estado sin errores, incluido el inicial `{}`; y no
 * aparecia nunca cuando la cuenta se creaba de verdad.
 *
 * Lo segundo no se arregla con un `ok`: `crearUsuarioVendedor` revalida la
 * ficha, que al volver ya no dibuja este formulario sino la cuenta recién
 * creada. El componente se desmonta en el mismo commit en que llega el estado
 * nuevo, asi que el `useEffect` que mostraria el toast no llega a correr.
 *
 * Tampoco hace falta: donde estaba el formulario aparece la cuenta con su
 * email. El toast que si funciona --el de `form-contacto.tsx`-- vive en un
 * formulario que sigue en pantalla despues de guardar.
 */
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

  return (
    <form action={accion} className="space-y-4">
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
