"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, AtSign, Check, KeyRound, ShieldOff } from "lucide-react";
import {
  cambiarEmailVendedor,
  cambiarEstadoCuentaVendedor,
  resetearPasswordVendedor,
  type EstadoFormulario,
} from "@/app/admin/vendedores/actions";
import { Campo } from "@/components/layout/campo";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PASSWORD_MIN } from "@/lib/validations/comunes";

/**
 * Los formularios viven dentro del `DialogContent`, que Radix desmonta al
 * cerrar: asi cada apertura arranca con el estado limpio y el dialogo no
 * necesita que nadie lo controle desde afuera.
 *
 * Cuando la accion sale bien, el panel muestra la confirmacion en lugar del
 * formulario. Cerrarlo solo desde un efecto obligaria a manejar estado, y en
 * una operacion sensible conviene que quede a la vista que salio bien.
 */

function BotonEnviar({ etiqueta }: { etiqueta: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Guardando…" : etiqueta}
    </Button>
  );
}

function Errores({ estado }: { estado: EstadoFormulario }) {
  const primero =
    estado.error ??
    Object.values(estado.errores ?? {})
      .flat()
      .find(Boolean);

  if (!primero) return null;
  return (
    <Alert variant="destructive">
      <AlertCircle />
      <AlertDescription>{primero}</AlertDescription>
    </Alert>
  );
}

function Listo({ mensaje }: { mensaje: string }) {
  return (
    <>
      <Alert>
        <Check />
        <AlertDescription>{mensaje}</AlertDescription>
      </Alert>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button">Listo</Button>
        </DialogClose>
      </DialogFooter>
    </>
  );
}

function FormResetear({ vendedorId }: { vendedorId: string }) {
  const [estado, accion] = useActionState<EstadoFormulario, FormData>(
    resetearPasswordVendedor,
    {}
  );

  if (estado.ok) {
    return <Listo mensaje="Contraseña cambiada. Ahora pasásela al vendedor." />;
  }

  return (
    <form action={accion} className="space-y-4">
      <input type="hidden" name="vendedorId" value={vendedorId} />

      <Errores estado={estado} />

      <Campo
        nombre="passwordReset"
        etiqueta="Contraseña"
        requerido
        errores={estado.errores?.password}
        ayuda={`Mínimo ${PASSWORD_MIN} caracteres. Se ve mientras la escribís para que puedas copiarla.`}
      >
        <Input
          id="passwordReset"
          name="password"
          type="text"
          minLength={PASSWORD_MIN}
          autoComplete="off"
          required
        />
      </Campo>

      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="ghost">
            Cancelar
          </Button>
        </DialogClose>
        <BotonEnviar etiqueta="Cambiar contraseña" />
      </DialogFooter>
    </form>
  );
}

function FormEmail({ vendedorId }: { vendedorId: string }) {
  const [estado, accion] = useActionState<EstadoFormulario, FormData>(
    cambiarEmailVendedor,
    {}
  );

  if (estado.ok) {
    return <Listo mensaje="Email actualizado. Con ese va a entrar de ahora en más." />;
  }

  return (
    <form action={accion} className="space-y-4">
      <input type="hidden" name="vendedorId" value={vendedorId} />

      <Errores estado={estado} />

      <Campo
        nombre="emailVendedor"
        etiqueta="Email nuevo"
        requerido
        errores={estado.errores?.email}
      >
        <Input id="emailVendedor" name="email" type="email" required />
      </Campo>

      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="ghost">
            Cancelar
          </Button>
        </DialogClose>
        <BotonEnviar etiqueta="Cambiar email" />
      </DialogFooter>
    </form>
  );
}

export function CuentaVendedor({
  vendedorId,
  email,
  activa,
}: {
  vendedorId: string;
  email: string;
  activa: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="secondary">{email}</Badge>
        {activa ? (
          <span className="text-sm text-muted-foreground">puede entrar</span>
        ) : (
          <Badge variant="outline" className="gap-1.5 text-warning">
            <ShieldOff className="size-3" />
            acceso suspendido
          </Badge>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <KeyRound className="size-4" />
              Cambiar contraseña
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Contraseña nueva</DialogTitle>
              <DialogDescription>
                Elegí una y pasásela vos. El sistema no manda mails: si no se la decís, no
                puede entrar.
              </DialogDescription>
            </DialogHeader>
            <FormResetear vendedorId={vendedorId} />
          </DialogContent>
        </Dialog>

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <AtSign className="size-4" />
              Cambiar email
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Email de ingreso</DialogTitle>
              <DialogDescription>Hoy entra con {email}.</DialogDescription>
            </DialogHeader>
            <FormEmail vendedorId={vendedorId} />
          </DialogContent>
        </Dialog>

        <form action={cambiarEstadoCuentaVendedor}>
          <input type="hidden" name="vendedorId" value={vendedorId} />
          <input type="hidden" name="activo" value={String(!activa)} />
          <Button type="submit" variant={activa ? "ghost" : "default"} size="sm">
            {activa ? "Suspender acceso" : "Reactivar acceso"}
          </Button>
        </form>
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">
        Suspender el acceso le impide entrar al sistema, pero sigue siendo vendedor activo y
        recibiendo leads. Para sacarlo del equipo, usá <strong>Dar de baja</strong> arriba.
      </p>
    </div>
  );
}
