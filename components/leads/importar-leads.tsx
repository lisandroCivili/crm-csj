"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { AlertCircle, CheckCircle2, TriangleAlert, Upload } from "lucide-react";
import {
  pasoImportacionLeads,
  type EstadoImportacionLeads,
} from "@/app/admin/leads/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const NOMBRE_CAMPO: Record<string, string> = {
  nombre: "Nombre",
  telefono: "Teléfono",
  email: "Email",
  direccion: "Dirección",
  localidad: "Localidad",
  provincia: "Provincia",
};

function Boton({ children, ...props }: React.ComponentProps<typeof Button>) {
  const { pending } = useFormStatus();
  return (
    <Button {...props} disabled={pending || props.disabled}>
      {pending ? "Procesando…" : children}
    </Button>
  );
}

export function ImportarLeads() {
  const [estado, accion] = useActionState<EstadoImportacionLeads, FormData>(
    pasoImportacionLeads,
    { paso: "inicial" }
  );

  if (estado.paso === "importado") {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-5 text-emerald-600" />
            <CardTitle>Leads importados</CardTitle>
          </div>
          <CardDescription>
            {estado.resumen.aImportar} leads nuevos desde {estado.archivoNombre}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/admin/leads">Ver y asignar los leads</Link>
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
            <CardTitle className="text-base">Subir leads</CardTitle>
            <CardDescription>
              El export de Meta Ads. Las columnas se detectan solas y se descartan los
              teléfonos repetidos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="archivo">Archivo</Label>
              <Input
                id="archivo"
                name="archivo"
                type="file"
                accept=".xls,.xlsx,.csv"
                required
              />
            </div>

            <fieldset className="space-y-2">
              <legend className="mb-2 text-sm font-medium">¿De dónde vienen?</legend>
              <label className="flex cursor-pointer items-start gap-3 rounded-md border p-3">
                <input type="radio" name="origen" value="PROPIO" defaultChecked className="mt-1" />
                <span>
                  <span className="block text-sm font-medium">Propios</span>
                  <span className="block text-xs text-muted-foreground">
                    Campañas que maneja Balta.
                  </span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-md border p-3">
                <input type="radio" name="origen" value="CLUB" className="mt-1" />
                <span>
                  <span className="block text-sm font-medium">Del club</span>
                  <span className="block text-xs text-muted-foreground">
                    Los que deriva Club San Jorge.
                  </span>
                </span>
              </label>
            </fieldset>

            {estado.error ? (
              <Alert variant="destructive">
                <AlertCircle />
                <AlertDescription>{estado.error}</AlertDescription>
              </Alert>
            ) : null}

            <Boton type="submit">
              <Upload className="size-4" />
              Analizar archivo
            </Boton>
          </CardContent>
        </Card>
      </form>
    );
  }

  const { resumen, columnasDetectadas, columnasIgnoradas, errores, muestra } = estado;
  const sinDetectar = (Object.keys(NOMBRE_CAMPO) as string[]).filter(
    (campo) => !columnasDetectadas[campo as keyof typeof columnasDetectadas]
  );

  return (
    <form action={accion} className="max-w-3xl space-y-4">
      <input type="hidden" name="accion" value="confirmar" />
      <input type="hidden" name="token" value={estado.token} />
      <input type="hidden" name="origen" value={estado.origen} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{estado.archivoNombre}</CardTitle>
          <CardDescription>
            {resumen.filasLeidas} filas leídas ·{" "}
            {estado.origen === "CLUB" ? "leads del club" : "leads propios"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Se importan
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-primary">
                {resumen.aImportar}
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Repetidos en el archivo
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {resumen.duplicadosEnArchivo}
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Ya estaban cargados
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{resumen.yaExistentes}</p>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">Columnas detectadas</p>
            <ul className="grid gap-1 text-sm sm:grid-cols-2">
              {Object.entries(NOMBRE_CAMPO).map(([campo, etiqueta]) => {
                const detectada = columnasDetectadas[campo as keyof typeof columnasDetectadas];
                return (
                  <li key={campo} className="flex gap-2">
                    <span className="text-muted-foreground">{etiqueta}:</span>
                    {detectada ? (
                      <span className="font-mono text-xs">{detectada}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">no vino</span>
                    )}
                  </li>
                );
              })}
            </ul>
            {columnasIgnoradas.length > 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Se ignoran: {columnasIgnoradas.join(", ")}
              </p>
            ) : null}
          </div>

          {sinDetectar.includes("telefono") ? (
            <Alert variant="destructive">
              <TriangleAlert />
              <AlertTitle>No se detectó la columna de teléfono</AlertTitle>
              <AlertDescription>
                Sin teléfono el vendedor no puede contactar al lead, y tampoco se pueden
                descartar repetidos. Revisá el archivo antes de confirmar.
              </AlertDescription>
            </Alert>
          ) : null}

          {muestra.length > 0 ? (
            <div>
              <p className="mb-2 text-sm font-medium">Primeros leads a importar</p>
              <ul className="divide-y rounded-md border text-sm">
                {muestra.map((lead, i) => (
                  <li key={i} className="flex flex-wrap gap-x-3 p-2">
                    <span className="font-medium">{lead.nombre}</span>
                    <span className="text-muted-foreground">{lead.telefono ?? "sin teléfono"}</span>
                    {lead.localidad ? (
                      <span className="text-muted-foreground">{lead.localidad}</span>
                    ) : null}
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
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Boton type="submit" disabled={resumen.aImportar === 0}>
          Importar {resumen.aImportar} leads
        </Boton>
        <Button type="button" variant="ghost" asChild>
          <Link href="/admin/leads">Cancelar</Link>
        </Button>
      </div>
    </form>
  );
}
