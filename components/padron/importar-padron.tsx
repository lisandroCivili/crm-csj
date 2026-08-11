"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { AlertCircle, CheckCircle2, FileSpreadsheet, TriangleAlert } from "lucide-react";
import { pasoImportacion, type EstadoImportacion } from "@/app/admin/padron/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

type VendedorOpcion = { id: string; nombreCompleto: string; codigo: string };

const MES = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric", timeZone: "UTC" });

function nombreDeMes(periodo: string): string {
  const [anio, mes] = periodo.split("-").map(Number);
  return MES.format(new Date(Date.UTC(anio, mes - 1, 1)));
}

function Boton({ children, ...props }: React.ComponentProps<typeof Button>) {
  const { pending } = useFormStatus();
  return (
    <Button {...props} disabled={pending || props.disabled}>
      {pending ? "Procesando…" : children}
    </Button>
  );
}

function Cifra({
  etiqueta,
  valor,
  detalle,
  destacado,
}: {
  etiqueta: string;
  valor: number;
  detalle?: string;
  destacado?: boolean;
}) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{etiqueta}</p>
      <p
        className={`mt-1 text-2xl font-semibold tabular-nums ${
          destacado && valor > 0 ? "text-primary" : ""
        }`}
      >
        {valor.toLocaleString("es-AR")}
      </p>
      {detalle ? <p className="mt-0.5 text-xs text-muted-foreground">{detalle}</p> : null}
    </div>
  );
}

export function ImportarPadron({ vendedores }: { vendedores: VendedorOpcion[] }) {
  const [estado, accion] = useActionState<EstadoImportacion, FormData>(pasoImportacion, {
    paso: "inicial",
  });

  // --- Resultado final ------------------------------------------------------
  if (estado.paso === "importado") {
    const { resumen } = estado;
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-5 text-emerald-600" />
            <CardTitle>Padrón importado</CardTitle>
          </div>
          <CardDescription>{estado.archivoNombre}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Cifra etiqueta="Clientes nuevos" valor={resumen.clientesNuevos} />
            <Cifra etiqueta="Títulos nuevos" valor={resumen.titulosNuevos} />
            <Cifra etiqueta="Cuotas nuevas" valor={resumen.cuotasNuevas} />
            <Cifra
              etiqueta="Recién cobradas"
              valor={resumen.cuotasRecienPagadas}
              detalle="pasaron de impagas a pagadas"
              destacado
            />
          </div>
          <div className="flex gap-2">
            <Button asChild>
              <Link href="/admin/clientes">Ver el padrón de clientes</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/admin/padron">Volver al histórico</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // --- Paso 1: subir --------------------------------------------------------
  if (estado.paso === "inicial") {
    return (
      <form action={accion}>
        <input type="hidden" name="accion" value="analizar" />
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle className="text-base">Subir padrón</CardTitle>
            <CardDescription>
              El archivo Excel que envía el club. Se analiza primero y no se guarda nada
              hasta que confirmes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="archivo">Archivo</Label>
              <Input id="archivo" name="archivo" type="file" accept=".xls,.xlsx" required />
            </div>

            {estado.error ? (
              <Alert variant="destructive">
                <AlertCircle />
                <AlertDescription>{estado.error}</AlertDescription>
              </Alert>
            ) : null}

            <Boton type="submit">
              <FileSpreadsheet className="size-4" />
              Analizar archivo
            </Boton>
          </CardContent>
        </Card>
      </form>
    );
  }

  // --- Paso 2: preview y vinculacion ---------------------------------------
  const { resumen, errores, periodos } = estado;
  const faltanVincular = resumen.nomVenSinMapear.length > 0;
  const sinNovedades =
    resumen.clientesNuevos === 0 &&
    resumen.titulosNuevos === 0 &&
    resumen.cuotasNuevas === 0 &&
    resumen.cuotasActualizadas === 0;

  return (
    <form action={accion} className="space-y-4">
      <input type="hidden" name="accion" value="procesar" />
      <input type="hidden" name="token" value={estado.token} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{estado.archivoNombre}</CardTitle>
          <CardDescription>
            {resumen.filasProcesadas.toLocaleString("es-AR")} filas ·{" "}
            {periodos.map(nombreDeMes).join(", ")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <p className="mb-2 text-sm font-medium">Qué va a pasar si confirmás</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Cifra etiqueta="Clientes nuevos" valor={resumen.clientesNuevos} />
              <Cifra etiqueta="Títulos nuevos" valor={resumen.titulosNuevos} />
              <Cifra etiqueta="Cuotas nuevas" valor={resumen.cuotasNuevas} />
              <Cifra
                etiqueta="Cuotas ya cargadas"
                valor={resumen.cuotasSinCambios}
                detalle="no se tocan"
              />
              <Cifra etiqueta="Clientes con cambios" valor={resumen.clientesActualizados} />
              <Cifra etiqueta="Títulos con cambios" valor={resumen.titulosActualizados} />
              <Cifra etiqueta="Cuotas con cambios" valor={resumen.cuotasActualizadas} />
              <Cifra
                etiqueta="Recién cobradas"
                valor={resumen.cuotasRecienPagadas}
                detalle="pasan de impagas a pagadas"
                destacado
              />
            </div>
          </div>

          {sinNovedades ? (
            <Alert>
              <CheckCircle2 />
              <AlertTitle>Este padrón no trae novedades</AlertTitle>
              <AlertDescription>
                Todas sus filas ya estaban cargadas. Confirmar no va a cambiar nada.
              </AlertDescription>
            </Alert>
          ) : null}

          {errores.length > 0 ? (
            <Alert>
              <TriangleAlert />
              <AlertTitle>
                {errores.length} fila{errores.length === 1 ? "" : "s"} con problemas
              </AlertTitle>
              <AlertDescription>
                <p>Se van a saltear. El resto se importa igual.</p>
                <ul className="mt-2 space-y-0.5 text-xs">
                  {errores.slice(0, 8).map((error) => (
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

      {faltanVincular ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Vendedores sin vincular ({resumen.nomVenSinMapear.length})
            </CardTitle>
            <CardDescription>
              El padrón escribe el nombre del vendedor como texto libre, y el mismo
              vendedor puede aparecer de varias formas. Indicá a quién corresponde cada
              uno: queda recordado y no se vuelve a preguntar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {vendedores.length === 0 ? (
              <Alert variant="destructive">
                <AlertCircle />
                <AlertTitle>No hay vendedores cargados en esta zona</AlertTitle>
                <AlertDescription>
                  Cargá primero el equipo de venta y después volvé a importar.
                  <Button variant="outline" size="sm" asChild className="mt-2 w-fit">
                    <Link href="/admin/vendedores/nuevo">Cargar un vendedor</Link>
                  </Button>
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <div className="max-h-96 divide-y overflow-y-auto rounded-md border">
                  {resumen.nomVenSinMapear.map((nomVen) => (
                    <div
                      key={nomVen}
                      className="flex flex-wrap items-center justify-between gap-3 p-3"
                    >
                      <span className="font-mono text-xs">{nomVen}</span>
                      <select
                        name={`vinculo:${nomVen}`}
                        defaultValue=""
                        className="h-9 min-w-56 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      >
                        <option value="">— elegir vendedor —</option>
                        {vendedores.map((vendedor) => (
                          <option key={vendedor.id} value={vendedor.id}>
                            {vendedor.nombreCompleto} ({vendedor.codigo})
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  ¿Falta alguien?{" "}
                  <Link
                    href="/admin/vendedores/nuevo"
                    target="_blank"
                    className="underline underline-offset-2"
                  >
                    Cargalo primero
                  </Link>{" "}
                  y volvé a analizar el archivo.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      ) : null}

      <Separator />

      <div className="flex flex-wrap gap-2">
        {faltanVincular ? (
          <Boton type="submit" disabled={vendedores.length === 0}>
            Vincular vendedores
          </Boton>
        ) : (
          <Boton type="submit" name="confirmar" value="1">
            Confirmar importación
          </Boton>
        )}
        <Button type="button" variant="ghost" asChild>
          <Link href="/admin/padron">Cancelar</Link>
        </Button>
      </div>

      {faltanVincular ? (
        <p className="text-xs text-muted-foreground">
          No se puede importar hasta vincular a todos: imputarle cuotas al vendedor
          equivocado rompe el cálculo de comisiones.
        </p>
      ) : null}
    </form>
  );
}
