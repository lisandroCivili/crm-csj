"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, Ban, RotateCcw } from "lucide-react";
import {
  anularVenta,
  reactivarVenta,
  type EstadoVenta,
} from "@/app/vendedor/ventas/actions";
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
import { Label } from "@/components/ui/label";

function BotonConfirmar({
  etiqueta,
  pendiente,
  variante,
}: {
  etiqueta: string;
  pendiente: string;
  variante?: "destructive";
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variante} disabled={pending}>
      {pending ? pendiente : etiqueta}
    </Button>
  );
}

/**
 * Anular no borra la venta: la marca. Sigue en los listados —atenuada—, con sus
 * adjuntos y su historial, y se puede reactivar.
 *
 * Los dos diálogos son de admin. Cada uno vive en su propio componente y no en
 * uno solo con un `if`: así el que sobra se desmonta al cambiar el estado de la
 * venta, y su cuadro no queda abierto encima de la página que acaba de volver.
 */
export function AnularVenta({ ventaId }: { ventaId: string }) {
  const [estado, accion] = useActionState<EstadoVenta, FormData>(anularVenta, {});
  const errores = estado.errores ?? {};

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Ban className="size-4" />
          Anular
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form action={accion}>
          <input type="hidden" name="id" value={ventaId} />
          <DialogHeader>
            <DialogTitle>Anular la venta</DialogTitle>
            <DialogDescription>
              La venta no se borra: queda marcada como anulada y se sigue viendo en los
              listados, con su documentación y su historial. No cambia ninguna comisión —
              esas salen del padrón, no de las ventas cargadas acá— y se puede reactivar.
            </DialogDescription>
          </DialogHeader>

          {estado.error ? (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle />
              <AlertDescription>{estado.error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="my-4 space-y-2">
            <Label htmlFor="motivo">
              Motivo<span className="text-destructive"> *</span>
            </Label>
            <textarea
              id="motivo"
              name="motivo"
              rows={3}
              required
              placeholder="Por qué se anula: el cliente se arrepintió, se cargó dos veces, el club la rechazó…"
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
            {errores.motivo?.length ? (
              <p className="text-xs text-destructive">{errores.motivo[0]}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Es lo único que después explica por qué esta venta está caída.
              </p>
            )}
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                Cancelar
              </Button>
            </DialogClose>
            <BotonConfirmar
              etiqueta="Anular la venta"
              pendiente="Anulando…"
              variante="destructive"
            />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ReactivarVenta({ ventaId }: { ventaId: string }) {
  const [estado, accion] = useActionState<EstadoVenta, FormData>(reactivarVenta, {});

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <RotateCcw className="size-4" />
          Reactivar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reactivar la venta</DialogTitle>
          <DialogDescription>
            Vuelve a quedar activa y se puede volver a editar. El motivo de la anulación
            se borra de la ficha, pero queda registrado en el historial de cambios.
          </DialogDescription>
        </DialogHeader>

        {estado.error ? (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertDescription>{estado.error}</AlertDescription>
          </Alert>
        ) : null}

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="ghost">
              Cancelar
            </Button>
          </DialogClose>
          <form action={accion}>
            <input type="hidden" name="id" value={ventaId} />
            <BotonConfirmar etiqueta="Reactivar" pendiente="Reactivando…" />
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
