"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { AlertCircle, CheckCircle2, TriangleAlert, Upload } from "lucide-react";
import { pasoImportacionPrecios, type EstadoPrecios } from "@/app/admin/planes/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SelectorArchivos } from "@/components/layout/selector-archivos";

const PESOS = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

const NOMBRE_CAMPO: Record<string, string> = {
  codigoProducto: "Código de producto",
  nombre: "Nombre del plan",
  precio: "Precio",
  duracionMeses: "Duración",
};

function Boton({ children, ...props }: React.ComponentProps<typeof Button>) {
  const { pending } = useFormStatus();
  return (
    <Button {...props} disabled={pending || props.disabled}>
      {pending ? "Procesando…" : children}
    </Button>
  );
}

export function ImportarPrecios() {
  const [estado, accion] = useActionState<EstadoPrecios, FormData>(pasoImportacionPrecios, {
    paso: "inicial",
  });
  const [archivos, setArchivos] = useState<File[]>([]);

  if (estado.paso === "importado") {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-5 text-emerald-600" />
            <CardTitle>Lista de precios actualizada</CardTitle>
          </div>
          <CardDescription>
            {estado.resumen.planesNuevos} planes nuevos y {estado.resumen.preciosNuevos} precios
            cargados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/admin/planes">Ver los planes</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (estado.paso === "inicial") {
    return (
      <form action={accion}>
        <input type="hidden" name="accion" value="analizar" />
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle className="text-base">Subir lista de precios</CardTitle>
            <CardDescription>
              Necesita al menos una columna de código de producto y una de precio.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <SelectorArchivos
              name="archivo"
              accept=".xls,.xlsx,.csv"
              invitacion="Elegí la lista de precios o arrastrala acá"
              ayuda="Un .xls, .xlsx o .csv del club"
              onCambio={setArchivos}
            />

            {estado.error ? (
              <Alert variant="destructive">
                <AlertCircle />
                <AlertDescription>{estado.error}</AlertDescription>
              </Alert>
            ) : null}

            <Boton type="submit" disabled={archivos.length === 0}>
              <Upload className="size-4" />
              Analizar archivo
            </Boton>
          </CardContent>
        </Card>
      </form>
    );
  }

  const { resumen, columnasDetectadas, errores, muestra } = estado;

  return (
    <form action={accion} className="max-w-3xl space-y-4">
      <input type="hidden" name="accion" value="confirmar" />
      <input type="hidden" name="token" value={estado.token} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{estado.archivoNombre}</CardTitle>
          <CardDescription>{resumen.filasLeidas} filas leídas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Planes nuevos
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{resumen.planesNuevos}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Precios a cargar
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-primary">
                {resumen.preciosNuevos}
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Sin cambios</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{resumen.sinCambios}</p>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">Columnas detectadas</p>
            <ul className="grid gap-1 text-sm sm:grid-cols-2">
              {Object.entries(NOMBRE_CAMPO).map(([campo, etiqueta]) => (
                <li key={campo} className="flex gap-2">
                  <span className="text-muted-foreground">{etiqueta}:</span>
                  {columnasDetectadas[campo] ? (
                    <span className="font-mono text-xs">{columnasDetectadas[campo]}</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">no vino</span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {muestra.length > 0 ? (
            <div>
              <p className="mb-2 text-sm font-medium">Primeros planes</p>
              <ul className="divide-y rounded-md border text-sm">
                {muestra.map((plan) => (
                  <li key={plan.codigoProducto} className="flex items-center gap-3 p-2">
                    <span className="font-mono text-xs tabular-nums">{plan.codigoProducto}</span>
                    <span className="min-w-0 flex-1 truncate">{plan.nombre}</span>
                    {plan.nuevo ? <Badge variant="secondary">nuevo</Badge> : null}
                    <span className="tabular-nums">{PESOS.format(plan.precio)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {errores.length > 0 ? (
            <Alert>
              <TriangleAlert />
              <AlertTitle>{errores.length} filas se saltean</AlertTitle>
              <AlertDescription>
                <ul className="text-xs">
                  {errores.slice(0, 5).map((error) => (
                    <li key={error.fila}>
                      Fila {error.fila}: {error.motivo}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          ) : null}

          {estado.error ? (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertDescription>{estado.error}</AlertDescription>
            </Alert>
          ) : null}

          <p className="text-xs text-muted-foreground">
            Los precios anteriores no se borran: quedan como histórico, así una venta vieja
            conserva el precio con el que se hizo.
          </p>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Boton type="submit">Confirmar</Boton>
        <Button type="button" variant="ghost" asChild>
          <Link href="/admin/planes">Cancelar</Link>
        </Button>
      </div>
    </form>
  );
}
