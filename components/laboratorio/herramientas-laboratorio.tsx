"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, Check, Landmark, Percent, Trash2, UserPlus } from "lucide-react";
import {
  cargarEscalaDeEjemplo,
  crearVendedoresDePrueba,
  restaurarContratoAgencia,
  vaciarPadron,
  type ResultadoVaciado,
} from "@/app/admin/laboratorio/actions";
import { Campo } from "@/components/layout/campo";
import { Alert, AlertDescription } from "@/components/ui/alert";
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

function Boton({ children, ...props }: React.ComponentProps<typeof Button>) {
  const { pending } = useFormStatus();
  return (
    <Button {...props} disabled={pending || props.disabled}>
      {pending ? "Trabajando…" : children}
    </Button>
  );
}

/**
 * El formulario vive dentro del `DialogContent`, que Radix desmonta al cerrar:
 * cada apertura arranca limpia sin tener que manejar estado. Es el mismo patron
 * que usa la cuenta del vendedor.
 */
function FormVaciar({ zona }: { zona: string }) {
  const [estado, accion] = useActionState<ResultadoVaciado, FormData>(vaciarPadron, {});

  if (estado.ok && estado.borrados) {
    const b = estado.borrados;
    return (
      <>
        <Alert>
          <Check />
          <AlertDescription>
            Listo: {b.clientes} clientes, {b.titulos} títulos, {b.cuotas} cuotas y{" "}
            {b.importaciones} importaciones.
          </AlertDescription>
        </Alert>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button">Listo</Button>
          </DialogClose>
        </DialogFooter>
      </>
    );
  }

  return (
    <form action={accion} className="space-y-4">
      {estado.error ? (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertDescription>{estado.error}</AlertDescription>
        </Alert>
      ) : null}

      <Campo
        nombre="confirmacion"
        etiqueta={`Escribí ${zona} para confirmar`}
        requerido
        ayuda="No se puede deshacer. Se borran los clientes, títulos, cuotas e importaciones de esta zona."
      >
        <Input id="confirmacion" name="confirmacion" autoComplete="off" required />
      </Campo>

      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="ghost">
            Cancelar
          </Button>
        </DialogClose>
        <Boton type="submit" variant="destructive">
          Vaciar el padrón
        </Boton>
      </DialogFooter>
    </form>
  );
}

export function HerramientasLaboratorio({ zona }: { zona: string }) {
  const [estadoVendedores, accionVendedores] = useActionState<ResultadoVaciado, FormData>(
    crearVendedoresDePrueba,
    {}
  );
  const [estadoEscala, accionEscala] = useActionState<ResultadoVaciado, FormData>(
    cargarEscalaDeEjemplo,
    {}
  );
  const [estadoContrato, accionContrato] = useActionState<ResultadoVaciado, FormData>(
    restaurarContratoAgencia,
    {}
  );

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="destructive">
            <Trash2 className="size-4" />
            Vaciar el padrón de {zona}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vaciar el padrón de {zona}</DialogTitle>
            <DialogDescription>
              Borra los clientes, títulos, cuotas e importaciones de esta zona. No toca
              vendedores, escalas, usuarios, leads ni ventas.
            </DialogDescription>
          </DialogHeader>
          <FormVaciar zona={zona} />
        </DialogContent>
      </Dialog>

      <form action={accionVendedores}>
        <Boton type="submit" variant="outline">
          <UserPlus className="size-4" />
          Crear los vendedores de prueba
        </Boton>
      </form>

      <form action={accionEscala}>
        <Boton type="submit" variant="outline">
          <Percent className="size-4" />
          Cargar escala de ejemplo
        </Boton>
      </form>

      <form action={accionContrato}>
        <Boton type="submit" variant="outline">
          <Landmark className="size-4" />
          Restaurar el contrato de agencia
        </Boton>
      </form>

      {estadoVendedores.ok ? (
        <span className="text-sm text-success">Vendedores de prueba listos.</span>
      ) : null}
      {estadoEscala.ok ? (
        <span className="text-sm text-success">Escala de ejemplo cargada (c1 a c5).</span>
      ) : null}
      {estadoContrato.ok ? (
        <span className="text-sm text-success">Contrato de agencia restaurado.</span>
      ) : null}
      {estadoContrato.error ? (
        <span className="text-sm text-destructive">{estadoContrato.error}</span>
      ) : null}
      {estadoVendedores.error ? (
        <span className="text-sm text-destructive">{estadoVendedores.error}</span>
      ) : null}
      {estadoEscala.error ? (
        <span className="text-sm text-destructive">{estadoEscala.error}</span>
      ) : null}
    </div>
  );
}
