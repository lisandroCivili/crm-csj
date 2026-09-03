"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  ListOrdered,
  PhoneOff,
  TriangleAlert,
  XCircle,
} from "lucide-react";
import {
  descartarPadron,
  pasoImportacion,
  type ArchivoPendiente,
  type EstadoImportacion,
  type ResultadoArchivo,
} from "@/app/admin/padron/actions";
import { PanelResumenPadron } from "@/components/padron/panel-resumen";
import { SelectorArchivos } from "@/components/layout/selector-archivos";
import { IMPAGAS_PARA_CAIDA } from "@/lib/padron/caidas";
import { MAXIMO_ARCHIVOS, TAMANIO_MAXIMO_TANDA } from "@/lib/padron/tanda";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type VendedorOpcion = { id: string; nombreCompleto: string; codigo: string };

const MES = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric", timeZone: "UTC" });

function nombreDeMes(periodo: string): string {
  const [anio, mes] = periodo.split("-").map(Number);
  return MES.format(new Date(Date.UTC(anio, mes - 1, 1)));
}

function mesesDe(archivo: ArchivoPendiente): string {
  return archivo.periodos.map(nombreDeMes).join(", ");
}

function Boton({ children, ...props }: React.ComponentProps<typeof Button>) {
  const { pending } = useFormStatus();
  return (
    <Button {...props} disabled={pending || props.disabled}>
      {pending ? "Procesando…" : children}
    </Button>
  );
}

function AvisoCaidas({ cantidad, cual }: { cantidad: number; cual: string }) {
  if (cantidad === 0) return null;
  return (
    <Alert>
      <PhoneOff />
      <AlertTitle>
        {cantidad.toLocaleString("es-AR")} título{cantidad === 1 ? "" : "s"} {cual}{" "}
        {cantidad === 1 ? "está caído" : "están caídos"}
      </AlertTitle>
      <AlertDescription>
        Acumulan {IMPAGAS_PARA_CAIDA} cuotas impagas seguidas o más. No cambia ninguna
        comisión: es para saber a quién llamar. En Clientes están los filtros por caída
        total, parcial y en riesgo.
      </AlertDescription>
    </Alert>
  );
}

function ListaDeErrores({ errores }: { errores: ArchivoPendiente["errores"] }) {
  if (errores.length === 0) return null;
  return (
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
  );
}

// --- Resultado final --------------------------------------------------------

function Resultado({ resultados }: { resultados: ResultadoArchivo[] }) {
  const entraron = resultados.filter((r) => r.resumen !== null);
  const fallaron = resultados.filter((r) => r.error !== null);
  const ultimo = entraron.at(-1);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            {entraron.length > 0 ? (
              <CheckCircle2 className="size-5 text-emerald-600" />
            ) : (
              <XCircle className="size-5 text-destructive" />
            )}
            <CardTitle>
              {resultados.length === 1
                ? entraron.length === 1
                  ? "Padrón importado"
                  : "No se pudo importar"
                : `${entraron.length} de ${resultados.length} padrones importados`}
            </CardTitle>
          </div>
          <CardDescription>
            {resultados.length === 1
              ? resultados[0].nombre
              : "Entraron en orden, del más viejo al más nuevo. Cada uno es una importación aparte."}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {resultados.map((resultado, indice) => (
            <div key={`${indice}-${resultado.nombre}`} className="space-y-3">
              {resultados.length > 1 ? (
                <p className="flex items-center gap-2 text-sm font-medium">
                  <FileSpreadsheet className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 break-all">{resultado.nombre}</span>
                </p>
              ) : null}

              {resultado.resumen ? (
                <PanelResumenPadron cifras={resultado.resumen} enPasado />
              ) : (
                <Alert variant="destructive">
                  <AlertCircle />
                  <AlertDescription>{resultado.error}</AlertDescription>
                </Alert>
              )}
            </div>
          ))}

          {fallaron.length > 0 && entraron.length > 0 ? (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertTitle>La tanda se cortó</AlertTitle>
              <AlertDescription>
                Los que entraron quedaron importados y no hay que volver a subirlos: son
                archivos independientes. Revisá {fallaron[0].nombre} y subí de nuevo, en
                orden, sólo los que faltan.
              </AlertDescription>
            </Alert>
          ) : null}

          {ultimo?.resumen ? (
            <AvisoCaidas
              cantidad={ultimo.resumen.titulosCaidos}
              cual={resultados.length === 1 ? "de este padrón" : "del último padrón"}
            />
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/admin/clientes">Ver el padrón de clientes</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/admin/padron">Volver al histórico</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// --- Paso 1: subir ----------------------------------------------------------

function PasoSubir({ error }: { error?: string }) {
  const [archivos, setArchivos] = useState<File[]>([]);

  const pesoTotal = archivos.reduce((total, archivo) => total + archivo.size, 0);
  const demasiados = archivos.length > MAXIMO_ARCHIVOS;
  const muyPesado = pesoTotal > TAMANIO_MAXIMO_TANDA;

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle className="text-base">Subir padrón</CardTitle>
        <CardDescription>
          Los archivos Excel que envía el club. Se analizan primero y no se guarda nada
          hasta que confirmes. Se pueden subir varios de una vez: entran en orden, del más
          viejo al más nuevo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <SelectorArchivos
          name="archivo"
          accept=".xls,.xlsx"
          multiple
          invitacion="Elegí los padrones o arrastralos acá"
          ayuda={`Archivos .xls o .xlsx, hasta ${MAXIMO_ARCHIVOS} por vez`}
          onCambio={setArchivos}
        />

        {demasiados || muyPesado ? (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertDescription>
              {demasiados
                ? `Son ${archivos.length} archivos y el tope por tanda es ${MAXIMO_ARCHIVOS}. Sacá algunos y subilos en dos veces, del más viejo al más nuevo.`
                : `Todo junto pesa ${(pesoTotal / 1024 / 1024).toFixed(1)} MB y el tope de una tanda es 25 MB. Subilos en dos veces, del más viejo al más nuevo.`}
            </AlertDescription>
          </Alert>
        ) : null}

        {error ? (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <Boton type="submit" disabled={archivos.length === 0 || demasiados || muyPesado}>
          <FileSpreadsheet className="size-4" />
          {archivos.length > 1 ? `Analizar ${archivos.length} archivos` : "Analizar archivo"}
        </Boton>
      </CardContent>
    </Card>
  );
}

// --- Paso 2: preview y vinculacion -----------------------------------------

function ListaOrdenada({ archivos }: { archivos: ArchivoPendiente[] }) {
  const conErrores = archivos.filter((a) => a.errores.length > 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ListOrdered className="size-5 text-muted-foreground" />
          <CardTitle className="text-base">
            {archivos.length} padrones, en este orden
          </CardTitle>
        </div>
        <CardDescription>
          Del más viejo al más nuevo, según el mes que trae cada archivo. El orden no es el
          de la selección y no es un detalle: es lo que decide si un título entra como venta
          nueva o como renovación.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ol className="divide-y rounded-md border">
          {archivos.map((archivo, indice) => (
            <li key={archivo.token} className="flex items-center gap-3 p-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold tabular-nums">
                {indice + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block break-all text-sm font-medium">{archivo.nombre}</span>
                <span className="block text-xs text-muted-foreground">
                  {mesesDe(archivo)} · {archivo.filas.toLocaleString("es-AR")} filas
                  {archivo.errores.length > 0
                    ? ` · ${archivo.errores.length} fila${archivo.errores.length === 1 ? "" : "s"} con problemas`
                    : ""}
                </span>
              </span>
            </li>
          ))}
        </ol>

        <Alert>
          <FileSpreadsheet />
          <AlertTitle>Las cifras de cada archivo se ven al terminar</AlertTitle>
          <AlertDescription>
            No se pueden calcular ahora: cada padrón se mide contra lo que ya está cargado, y
            el segundo se va a medir contra una base que todavía no tiene importado el
            primero. Mostrar esos números sería mostrar números que no se van a cumplir.
          </AlertDescription>
        </Alert>

        {conErrores.length > 0 ? (
          <Alert>
            <TriangleAlert />
            <AlertTitle>
              {conErrores.reduce((total, a) => total + a.errores.length, 0)} filas con
              problemas en {conErrores.length} archivo{conErrores.length === 1 ? "" : "s"}
            </AlertTitle>
            <AlertDescription>
              <p>Se van a saltear. El resto se importa igual.</p>
              <ul className="mt-2 space-y-0.5 text-xs">
                {conErrores.slice(0, 3).map((archivo) => (
                  <li key={archivo.token}>
                    {archivo.nombre}: fila {archivo.errores[0].fila},{" "}
                    {archivo.errores[0].motivo}
                    {archivo.errores.length > 1 ? ` (y ${archivo.errores.length - 1} más)` : ""}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  );
}

function PasoPreview({
  estado,
  vendedores,
}: {
  estado: Extract<EstadoImportacion, { paso: "preview" }>;
  vendedores: VendedorOpcion[];
}) {
  const { archivos, resumen, nomVenSinMapear } = estado;
  const faltanVincular = nomVenSinMapear.length > 0;
  const unico = archivos.length === 1 ? archivos[0] : null;

  const sinNovedades =
    resumen !== null &&
    resumen.clientesNuevos === 0 &&
    resumen.titulosNuevos === 0 &&
    resumen.cuotasNuevas === 0 &&
    resumen.cuotasActualizadas === 0;

  return (
    <>
      {unico && resumen ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{unico.nombre}</CardTitle>
            <CardDescription>
              {resumen.filasProcesadas.toLocaleString("es-AR")} filas · {mesesDe(unico)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="mb-2 text-sm font-medium">Qué va a pasar si confirmás</p>
              <PanelResumenPadron cifras={resumen} />
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

            <ListaDeErrores errores={unico.errores} />

            {estado.error ? (
              <Alert variant="destructive">
                <AlertCircle />
                <AlertDescription>{estado.error}</AlertDescription>
              </Alert>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <>
          <ListaOrdenada archivos={archivos} />
          {estado.error ? (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertDescription>{estado.error}</AlertDescription>
            </Alert>
          ) : null}
        </>
      )}

      {resumen && resumen.titulosDeOtraZona.length > 0 ? (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertDescription>
            <p className="font-medium">
              {resumen.titulosDeOtraZona.length} título(s) de este archivo ya existen en
              otra zona.
            </p>
            <p>
              El número de título es único en todo el sistema, así que no se pueden crear
              acá: {resumen.titulosDeOtraZona.slice(0, 8).join(", ")}
              {resumen.titulosDeOtraZona.length > 8 ? "…" : ""}. Revisá que el archivo sea
              de la zona que tenés activa.
            </p>
          </AlertDescription>
        </Alert>
      ) : null}

      {faltanVincular ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Vendedores sin vincular ({nomVenSinMapear.length})
            </CardTitle>
            <CardDescription>
              El padrón escribe el nombre del vendedor como texto libre, y el mismo vendedor
              puede aparecer de varias formas. Indicá a quién corresponde cada uno: queda
              recordado y no se vuelve a preguntar.
              {archivos.length > 1
                ? " Están juntos los de todos los archivos de la tanda."
                : ""}
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
                  {nomVenSinMapear.map((nomVen) => (
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
            {archivos.length > 1
              ? `Confirmar e importar los ${archivos.length}`
              : "Confirmar importación"}
          </Boton>
        )}

        {/*
          Cancelar es un submit del mismo formulario a otra acción, y no un
          `<Link>` como era antes: así se lleva los tokens y borra los
          temporales. Con un link, cada importación abandonada dejaba dos
          archivos por padrón en uploads/tmp, para siempre.
        */}
        <Boton type="submit" variant="ghost" formAction={descartarPadron} formNoValidate>
          Cancelar
        </Boton>
      </div>

      {faltanVincular ? (
        <p className="text-xs text-muted-foreground">
          No se puede importar hasta vincular a todos: imputarle cuotas al vendedor
          equivocado rompe el cálculo de comisiones.
        </p>
      ) : null}
    </>
  );
}

// --- El formulario ----------------------------------------------------------

export function ImportarPadron({ vendedores }: { vendedores: VendedorOpcion[] }) {
  const [estado, accion] = useActionState<EstadoImportacion, FormData>(pasoImportacion, {
    paso: "inicial",
  });

  if (estado.paso === "importado") return <Resultado resultados={estado.resultados} />;

  if (estado.paso === "inicial") {
    return (
      <form action={accion}>
        <input type="hidden" name="accion" value="analizar" />
        <PasoSubir error={estado.error} />
      </form>
    );
  }

  return (
    <form action={accion} className="space-y-4">
      <input type="hidden" name="accion" value="procesar" />
      {estado.archivos.map((archivo) => (
        <input key={archivo.token} type="hidden" name="token" value={archivo.token} />
      ))}
      <PasoPreview estado={estado} vendedores={vendedores} />
    </form>
  );
}
