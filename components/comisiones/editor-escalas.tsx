"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { AlertCircle, Plus, Trash2 } from "lucide-react";
import {
  eliminarTramo,
  guardarTramo,
  type EstadoTramo,
} from "@/app/admin/comisiones/escalas/actions";
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
import { CUOTAS_COMISIONABLES } from "@/lib/comisiones/constantes";
import type { Tramo } from "@/lib/comisiones/escalas";

/** 2.5 se escribe 2,5. La validacion acepta las dos formas. */
function conComa(valor: number | null): string {
  return valor === null ? "" : String(valor).replace(".", ",");
}

const COLUMNAS = "grid-cols-[4.5rem_5rem_repeat(5,minmax(3.25rem,1fr))_7rem]";

function BotonGuardar({ nuevo }: { nuevo: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" variant={nuevo ? "default" : "outline"} disabled={pending}>
      {pending ? "…" : nuevo ? "Agregar" : "Guardar"}
    </Button>
  );
}

function BorrarTramo({ ventasMin, rango }: { ventasMin: number; rango: string }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="text-muted-foreground hover:text-destructive"
          aria-label={`Eliminar el tramo de ${rango} ventas`}
        >
          <Trash2 className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eliminar el tramo de {rango} ventas</DialogTitle>
          <DialogDescription>
            Se borran los porcentajes de todas las cuotas de este tramo. Los períodos ya
            cerrados no se tocan: conservan el porcentaje con el que se liquidaron.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="ghost">
              Cancelar
            </Button>
          </DialogClose>
          <form action={eliminarTramo}>
            <input type="hidden" name="ventasMin" value={ventasMin} />
            <Button type="submit" variant="destructive">
              Eliminar tramo
            </Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FilaTramo({ tramo }: { tramo?: Tramo }) {
  const nuevo = !tramo;
  const [estado, accion] = useActionState<EstadoTramo, FormData>(guardarTramo, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!estado.ok) return;
    toast.success(nuevo ? "Tramo agregado." : "Tramo actualizado.");
    if (nuevo) formRef.current?.reset();
  }, [estado, nuevo]);

  const errores = estado.errores ?? {};
  const mensajes = [
    estado.error,
    ...Object.values(errores)
      .flat()
      .filter((mensaje): mensaje is string => Boolean(mensaje)),
  ].filter(Boolean);

  const rango =
    tramo === undefined
      ? ""
      : tramo.ventasMax === null
        ? `${tramo.ventasMin} o más`
        : `${tramo.ventasMin} a ${tramo.ventasMax}`;

  return (
    <form
      ref={formRef}
      action={accion}
      className={nuevo ? "border-t border-dashed pb-1 pt-3" : "border-t py-1"}
    >
      {tramo ? (
        <input type="hidden" name="ventasMinOriginal" value={tramo.ventasMin} />
      ) : null}

      <div className={`grid items-center gap-2 ${COLUMNAS}`}>
        <Input
          name="ventasMin"
          type="number"
          min={0}
          required
          aria-label="Desde cuántas ventas"
          defaultValue={tramo?.ventasMin ?? ""}
          className="h-8 tabular-nums"
        />
        <Input
          name="ventasMax"
          type="number"
          min={0}
          aria-label="Hasta cuántas ventas"
          placeholder="∞"
          defaultValue={tramo?.ventasMax ?? ""}
          className="h-8 tabular-nums"
        />

        {CUOTAS_COMISIONABLES.map((numeroCuota, indice) => (
          <Input
            key={numeroCuota}
            name={`porcentaje${numeroCuota}`}
            inputMode="decimal"
            aria-label={`Porcentaje de la cuota ${numeroCuota}`}
            placeholder="—"
            defaultValue={conComa(tramo?.porcentajes[indice] ?? null)}
            className="h-8 text-right tabular-nums"
          />
        ))}

        <div className="flex items-center gap-1 pl-1">
          <BotonGuardar nuevo={nuevo} />
          {tramo ? <BorrarTramo ventasMin={tramo.ventasMin} rango={rango} /> : null}
        </div>
      </div>

      {mensajes.length > 0 ? (
        <Alert variant="destructive" className="mt-2">
          <AlertCircle />
          <AlertDescription>{mensajes[0]}</AlertDescription>
        </Alert>
      ) : null}
    </form>
  );
}

export function EditorEscalas({ tramos }: { tramos: Tramo[] }) {
  // El formulario de alta se re-monta al cambiar la cantidad de tramos, asi
  // queda limpio despues de agregar uno sin arrastrar el estado anterior.
  const [mostrarAlta, setMostrarAlta] = useState(tramos.length === 0);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[38rem] space-y-1">
        <div
          className={`grid items-end gap-2 pb-2 text-xs font-medium text-muted-foreground ${COLUMNAS}`}
        >
          <span>Desde</span>
          <span>Hasta</span>
          {CUOTAS_COMISIONABLES.map((numeroCuota) => (
            <span key={numeroCuota} className="text-right">
              c{numeroCuota} %
            </span>
          ))}
          <span />
        </div>

        {tramos.map((tramo) => (
          <FilaTramo key={tramo.ventasMin} tramo={tramo} />
        ))}

        {mostrarAlta ? (
          <div className="pt-3">
            <FilaTramo key={`alta-${tramos.length}`} />
          </div>
        ) : (
          <div className="pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setMostrarAlta(true)}
            >
              <Plus className="size-4" />
              Agregar tramo
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
