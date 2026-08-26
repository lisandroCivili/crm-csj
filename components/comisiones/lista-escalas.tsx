"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, Check, Pencil, Star, Trash2 } from "lucide-react";
import {
  crearEscala,
  eliminarEscala,
  marcarPredeterminada,
  renombrarEscala,
  type EstadoTramo,
  type ResultadoEscala,
} from "@/app/admin/comisiones/escalas/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

type EscalaFila = {
  id: string;
  nombre: string;
  esPredeterminada: boolean;
  cantidadTramos: number;
  cantidadVendedores: number;
};

function BotonEnviar({ etiqueta, cargando }: { etiqueta: string; cargando: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? cargando : etiqueta}
    </Button>
  );
}

function NuevaEscala() {
  const [estado, accion] = useActionState<EstadoTramo, FormData>(crearEscala, {});
  const error = estado.error ?? estado.errores?.nombre?.[0];

  return (
    <form action={accion} className="flex flex-wrap items-start gap-2">
      <Input name="nombre" placeholder="Nombre de la escala nueva" required className="max-w-xs" />
      <BotonEnviar etiqueta="Crear escala" cargando="Creando…" />
      {error ? <p className="w-full text-sm text-destructive">{error}</p> : null}
    </form>
  );
}

function RenombrarEscala({ id, nombre }: { id: string; nombre: string }) {
  const [estado, accion] = useActionState<EstadoTramo, FormData>(renombrarEscala, {});

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="icon" aria-label={`Renombrar ${nombre}`}>
          <Pencil className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Renombrar escala</DialogTitle>
        </DialogHeader>

        {estado.ok ? (
          <>
            <Alert>
              <Check />
              <AlertDescription>Nombre actualizado.</AlertDescription>
            </Alert>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button">Listo</Button>
              </DialogClose>
            </DialogFooter>
          </>
        ) : (
          <form action={accion} className="space-y-4">
            <input type="hidden" name="id" value={id} />
            {estado.error ? (
              <Alert variant="destructive">
                <AlertCircle />
                <AlertDescription>{estado.error}</AlertDescription>
              </Alert>
            ) : null}
            <Input name="nombre" defaultValue={nombre} required autoFocus />
            {estado.errores?.nombre ? (
              <p className="text-sm text-destructive">{estado.errores.nombre[0]}</p>
            ) : null}
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="ghost">
                  Cancelar
                </Button>
              </DialogClose>
              <BotonEnviar etiqueta="Guardar" cargando="Guardando…" />
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function EliminarEscala({ escala }: { escala: EscalaFila }) {
  const accionEliminar = async (_previo: ResultadoEscala, formData: FormData) =>
    eliminarEscala(formData);
  const [estado, accion] = useActionState<ResultadoEscala, FormData>(accionEliminar, {});

  const bloqueada = escala.esPredeterminada || escala.cantidadVendedores > 0;
  const motivoBloqueo = escala.esPredeterminada
    ? "Es la escala predeterminada: no se puede eliminar."
    : escala.cantidadVendedores > 0
      ? `Tiene ${escala.cantidadVendedores} vendedor(es) asignado(s). Cambialos de escala antes de borrarla.`
      : null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-destructive"
          aria-label={`Eliminar la escala ${escala.nombre}`}
        >
          <Trash2 className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eliminar la escala {escala.nombre}</DialogTitle>
          <DialogDescription>
            Se borran también sus {escala.cantidadTramos} tramo(s) cargados. No se puede
            deshacer.
          </DialogDescription>
        </DialogHeader>

        {motivoBloqueo ? (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertDescription>{motivoBloqueo}</AlertDescription>
          </Alert>
        ) : estado.error ? (
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
          {bloqueada ? null : (
            <form action={accion}>
              <input type="hidden" name="id" value={escala.id} />
              <Button type="submit" variant="destructive">
                Eliminar escala
              </Button>
            </form>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TarjetaEscala({ escala }: { escala: EscalaFila }) {
  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/admin/comisiones/escalas/${escala.id}`}
              className="truncate font-medium hover:underline"
            >
              {escala.nombre}
            </Link>
            {escala.esPredeterminada ? (
              <Badge variant="secondary" className="gap-1">
                <Star className="size-3" />
                Predeterminada
              </Badge>
            ) : null}
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {escala.cantidadTramos} tramo(s) · {escala.cantidadVendedores} vendedor(es)
          </p>
        </div>

        <div className="flex items-center gap-1">
          {escala.esPredeterminada ? null : (
            <form action={marcarPredeterminada}>
              <input type="hidden" name="id" value={escala.id} />
              <Button type="submit" variant="outline" size="sm">
                Marcar predeterminada
              </Button>
            </form>
          )}
          <RenombrarEscala id={escala.id} nombre={escala.nombre} />
          <EliminarEscala escala={escala} />
          <Button variant="outline" size="sm" asChild>
            <Link href={`/admin/comisiones/escalas/${escala.id}`}>Editar tramos</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function ListaEscalas({ escalas }: { escalas: EscalaFila[] }) {
  return (
    <div className="space-y-4">
      {escalas.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Todavía no hay ninguna escala. Creá la primera: queda como predeterminada hasta que
          crees otra y la marques a ella.
        </p>
      ) : (
        <div className="space-y-2">
          {escalas.map((escala) => (
            <TarjetaEscala key={escala.id} escala={escala} />
          ))}
        </div>
      )}

      <Card>
        <CardContent className="py-4">
          <p className="mb-3 text-sm font-medium">Nueva escala</p>
          <NuevaEscala />
        </CardContent>
      </Card>
    </div>
  );
}
