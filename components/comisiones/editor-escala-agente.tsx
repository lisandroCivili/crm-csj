"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { AlertCircle, Plus, Trash2 } from "lucide-react";
import {
  eliminarTramoAgente,
  guardarTramoAgente,
  type EstadoTramoAgente,
} from "@/app/admin/comisiones/agente/escala/actions";
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
import type { TramoAgente } from "@/lib/comisiones/calcularComisionAgente";

/** 2.5 se escribe 2,5. La validacion acepta las dos formas. */
function conComa(valor: number | null): string {
  return valor === null ? "" : String(valor).replace(".", ",");
}

const COLUMNAS = "grid-cols-[6rem_6rem_1fr_7rem]";

function rangoDe(tramo: TramoAgente): string {
  return tramo.cuotaHasta === null
    ? `${tramo.cuotaDesde} en adelante`
    : `${tramo.cuotaDesde} a ${tramo.cuotaHasta}`;
}

function BotonGuardar({ nuevo }: { nuevo: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" variant={nuevo ? "default" : "outline"} disabled={pending}>
      {pending ? "…" : nuevo ? "Agregar" : "Guardar"}
    </Button>
  );
}

function BorrarTramo({ tramo }: { tramo: TramoAgente }) {
  const rango = rangoDe(tramo);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="text-muted-foreground hover:text-destructive"
          aria-label={`Eliminar el tramo de la cuota ${rango}`}
        >
          <Trash2 className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eliminar el tramo de la cuota {rango}</DialogTitle>
          <DialogDescription>
            Esas cuotas dejan de comisionar hasta que cargues otro tramo que las cubra. Los
            períodos ya cerrados no se tocan: conservan el porcentaje con el que se liquidaron.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="ghost">
              Cancelar
            </Button>
          </DialogClose>
          <form action={eliminarTramoAgente}>
            <input type="hidden" name="cuotaDesde" value={tramo.cuotaDesde} />
            <Button type="submit" variant="destructive">
              Eliminar tramo
            </Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FilaTramo({ tramo }: { tramo?: TramoAgente }) {
  const nuevo = !tramo;
  const [estado, accion] = useActionState<EstadoTramoAgente, FormData>(guardarTramoAgente, {});
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

  return (
    <form
      ref={formRef}
      action={accion}
      className={nuevo ? "border-t border-dashed pb-1 pt-3" : "border-t py-1"}
    >
      {tramo ? (
        <input type="hidden" name="cuotaDesdeOriginal" value={tramo.cuotaDesde} />
      ) : null}

      <div className={`grid items-center gap-2 ${COLUMNAS}`}>
        <Input
          name="cuotaDesde"
          type="number"
          min={1}
          required
          aria-label="Desde qué número de cuota"
          defaultValue={tramo?.cuotaDesde ?? ""}
          className="h-8 tabular-nums"
        />
        <Input
          name="cuotaHasta"
          type="number"
          min={1}
          aria-label="Hasta qué número de cuota"
          placeholder="∞"
          defaultValue={tramo?.cuotaHasta ?? ""}
          className="h-8 tabular-nums"
        />
        <Input
          name="porcentaje"
          inputMode="decimal"
          required
          aria-label="Porcentaje del tramo"
          placeholder="—"
          defaultValue={conComa(tramo?.porcentaje ?? null)}
          className="h-8 text-right tabular-nums"
        />

        <div className="flex items-center gap-1 pl-1">
          <BotonGuardar nuevo={nuevo} />
          {tramo ? <BorrarTramo tramo={tramo} /> : null}
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

/**
 * Los tramos del contrato de agencia. Un solo eje —el numero de cuota—, a
 * diferencia de la escala del vendedor, que cruza volumen del mes por cuota.
 */
export function EditorEscalaAgente({ tramos }: { tramos: TramoAgente[] }) {
  const [mostrarAlta, setMostrarAlta] = useState(tramos.length === 0);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[28rem] space-y-1">
        <div
          className={`grid items-end gap-2 pb-2 text-xs font-medium text-muted-foreground ${COLUMNAS}`}
        >
          <span>Desde cuota</span>
          <span>Hasta cuota</span>
          <span className="text-right">%</span>
          <span />
        </div>

        {tramos.map((tramo) => (
          <FilaTramo key={tramo.cuotaDesde} tramo={tramo} />
        ))}

        {mostrarAlta ? (
          <div className="pt-3">
            <FilaTramo key={`alta-${tramos.length}`} />
          </div>
        ) : (
          <div className="pt-3">
            <Button type="button" variant="outline" size="sm" onClick={() => setMostrarAlta(true)}>
              <Plus className="size-4" />
              Agregar tramo
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
