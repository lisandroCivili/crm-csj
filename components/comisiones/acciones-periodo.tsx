"use client";

import { useFormStatus } from "react-dom";
import { Lock, LockOpen } from "lucide-react";
import { cerrarPeriodoAccion, reabrirPeriodoAccion } from "@/app/admin/comisiones/actions";
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

const PESOS = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" });

function BotonConfirmar({ etiqueta, variante }: { etiqueta: string; variante?: "destructive" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variante} disabled={pending}>
      {pending ? "Procesando…" : etiqueta}
    </Button>
  );
}

/**
 * Cerrar congela los porcentajes: a partir de ahi el periodo no se recalcula
 * aunque cambie la escala o entre un padron nuevo. Es la accion que convierte
 * el calculo en la liquidacion que se paga.
 */
export function CerrarPeriodo({
  periodo,
  etiqueta,
  vendedores,
  total,
  deshabilitado,
}: {
  periodo: string;
  etiqueta: string;
  vendedores: number;
  total: number;
  deshabilitado?: boolean;
}) {
  if (deshabilitado) {
    return (
      <Button disabled title="Cargá la escala y esperá el padrón antes de cerrar">
        <Lock className="size-4" />
        Cerrar el período
      </Button>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>
          <Lock className="size-4" />
          Cerrar el período
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cerrar {etiqueta}</DialogTitle>
          <DialogDescription>
            Se guarda la liquidación de {vendedores}{" "}
            {vendedores === 1 ? "vendedor" : "vendedores"} por {PESOS.format(total)} y los
            porcentajes quedan congelados. Si después cambiás una escala o importás otro
            padrón, este período no se mueve. Se puede reabrir.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="ghost">
              Cancelar
            </Button>
          </DialogClose>
          <form action={cerrarPeriodoAccion}>
            <input type="hidden" name="periodo" value={periodo} />
            <BotonConfirmar etiqueta="Cerrar el período" />
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ReabrirPeriodo({ periodo, etiqueta }: { periodo: string; etiqueta: string }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <LockOpen className="size-4" />
          Reabrir
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reabrir {etiqueta}</DialogTitle>
          <DialogDescription>
            Vuelve a borrador y se recalcula con la escala y el padrón de hoy, así que los
            montos pueden cambiar. Al cerrarlo de nuevo se congela la versión nueva.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="ghost">
              Cancelar
            </Button>
          </DialogClose>
          <form action={reabrirPeriodoAccion}>
            <input type="hidden" name="periodo" value={periodo} />
            <BotonConfirmar etiqueta="Reabrir" variante="destructive" />
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
