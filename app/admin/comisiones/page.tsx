import Link from "next/link";
import {
  BadgeDollarSign,
  ChevronLeft,
  ChevronRight,
  Lock,
  Percent,
  ScrollText,
  Sigma,
  TriangleAlert,
} from "lucide-react";
import { CerrarPeriodo, ReabrirPeriodo } from "@/components/comisiones/acciones-periodo";
import { InputGastos } from "@/components/comisiones/input-gastos";
import { DatoFila, ListaTarjetas, TarjetaFila } from "@/components/layout/lista-tarjetas";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/layout/stat-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { obtenerLiquidacion } from "@/lib/comisiones/liquidacion";
import {
  esPeriodoValido,
  etiquetaPeriodo,
  periodoActual,
  periodoAnterior,
} from "@/lib/comisiones/periodo";
import { pesos } from "@/lib/formato";
import { requireAdmin, requireZonaActivaId } from "@/lib/sesion";

const FECHA = new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" });

export default async function ComisionesPage({ searchParams }: PageProps<"/admin/comisiones">) {
  await requireAdmin();
  const zonaId = await requireZonaActivaId();

  const parametros = await searchParams;
  const hoy = periodoActual();
  const pedido = typeof parametros.periodo === "string" ? parametros.periodo : "";
  const periodo = esPeriodoValido(pedido) ? pedido : hoy;

  const liquidacion = await obtenerLiquidacion({ zonaId, periodo });
  const etiqueta = etiquetaPeriodo(periodo);
  const cerrado = liquidacion.estado === "CERRADO";

  // Los vendedores sin nada que cobrar y sin gastos cargados se agrupan al pie:
  // ocupan la tabla sin aportar y esconden a los que sí liquidan.
  const conMovimiento = liquidacion.lineas.filter(
    (linea) => linea.renglones.length > 0 || linea.gastosRepresentacion > 0
  );
  const sinMovimiento = liquidacion.lineas.filter(
    (linea) => !conMovimiento.includes(linea) && linea.activo
  );

  const advertencias = [...new Set(liquidacion.lineas.flatMap((linea) => linea.advertencias))];
  const cuotasCobradas = conMovimiento.reduce(
    (suma, linea) => suma + linea.renglones.reduce((n, renglon) => n + renglon.cantidadCuotas, 0),
    0
  );

  const irA = (destino: string) => `/admin/comisiones?periodo=${destino}`;
  const siguiente = periodoAnterior(periodo, -1);

  return (
    <>
      <PageHeader
        titulo="Comisiones"
        descripcion="Lo que le corresponde a cada vendedor por las cuotas que el padrón mostró cobradas en el mes."
        acciones={
          <>
            <Button variant="outline" asChild>
              <Link href="/admin/comisiones/escalas">
                <Percent className="size-4" />
                Escalas
              </Link>
            </Button>
            {cerrado ? (
              <ReabrirPeriodo periodo={periodo} etiqueta={etiqueta} />
            ) : (
              // Sin escala todo liquida en cero: cerrar ahí solo congelaría
              // ceros y habría que reabrir el período para arreglarlo.
              <CerrarPeriodo
                periodo={periodo}
                etiqueta={etiqueta}
                vendedores={conMovimiento.length}
                total={liquidacion.totales.total}
                deshabilitado={liquidacion.sinEscalas || conMovimiento.length === 0}
              />
            )}
          </>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" asChild>
            <Link href={irA(periodoAnterior(periodo))} aria-label="Mes anterior">
              <ChevronLeft className="size-4" />
            </Link>
          </Button>
          <span className="min-w-44 text-center text-sm font-medium first-letter:uppercase">{etiqueta}</span>
          <Button
            variant="outline"
            size="icon"
            asChild={periodo < hoy}
            disabled={periodo >= hoy}
            aria-label="Mes siguiente"
          >
            {periodo < hoy ? (
              <Link href={irA(siguiente)}>
                <ChevronRight className="size-4" />
              </Link>
            ) : (
              <ChevronRight className="size-4" />
            )}
          </Button>
        </div>

        {cerrado ? (
          <Badge variant="secondary" className="gap-1.5">
            <Lock className="size-3" />
            Cerrado
            {conMovimiento[0]?.fechaCierre
              ? ` · ${FECHA.format(conMovimiento[0].fechaCierre)}`
              : ""}
          </Badge>
        ) : (
          <Badge variant="outline">Borrador · se recalcula solo</Badge>
        )}

        {periodo !== hoy ? (
          <Button variant="ghost" size="sm" asChild>
            <Link href={irA(hoy)}>Ir al mes actual</Link>
          </Button>
        ) : null}
      </div>

      {liquidacion.sinEscalas ? (
        <Alert className="mb-6">
          <TriangleAlert />
          <AlertTitle>Todavía no hay escalas cargadas</AlertTitle>
          <AlertDescription>
            <p>
              Sin escala no hay porcentaje que aplicar y todo liquida en cero. Se carga una
              sola vez y vale para las dos zonas.
            </p>
            <Button size="sm" asChild className="mt-1">
              <Link href="/admin/comisiones/escalas">
                <Percent className="size-4" />
                Cargar escalas
              </Link>
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Si no hay ninguna escala, el cartel de arriba ya lo dice: repetir un
          aviso por vendedor solo agrega ruido. */}
      {!liquidacion.sinEscalas && advertencias.length > 0 ? (
        <Alert variant="destructive" className="mb-6">
          <TriangleAlert />
          <AlertTitle>Hay huecos en la escala</AlertTitle>
          <AlertDescription>
            <ul className="list-disc space-y-1 pl-4">
              {advertencias.slice(0, 5).map((aviso) => (
                <li key={aviso}>{aviso}</li>
              ))}
              {advertencias.length > 5 ? (
                <li>y {advertencias.length - 5} aviso(s) más del mismo tipo.</li>
              ) : null}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          etiqueta="Ventas nuevas del mes"
          valor={liquidacion.totales.ventasNuevas}
          detalle="cuotas 1 cobradas según el padrón"
          icono={ScrollText}
          tono="marca"
        />
        <StatCard
          etiqueta="Cuotas cobradas"
          valor={cuotasCobradas}
          detalle="las que entran en la liquidación"
          icono={Sigma}
        />
        <StatCard
          etiqueta="Comisión por cuotas"
          valor={pesos(liquidacion.totales.comisionCuotas)}
          detalle={`+ ${pesos(liquidacion.totales.gastos)} de gastos`}
          icono={Percent}
          tono="exito"
        />
        <StatCard
          etiqueta="Total a pagar"
          valor={pesos(liquidacion.totales.total)}
          detalle={`${conMovimiento.length} ${conMovimiento.length === 1 ? "vendedor" : "vendedores"}`}
          icono={BadgeDollarSign}
          tono={cerrado ? "exito" : "atencion"}
        />
      </div>

      {conMovimiento.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <BadgeDollarSign className="size-8 text-muted-foreground" />
            <div>
              <p className="font-medium">No hay nada que liquidar en {etiqueta}</p>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                Una cuota entra en el mes en que el padrón la mostró cobrada por primera vez.
                Si todavía no importaste el padrón de este ciclo, va a estar vacío.
              </p>
            </div>
            <Button variant="outline" asChild className="mt-2">
              <Link href="/admin/padron/importar">Importar un padrón</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <ListaTarjetas>
            {conMovimiento.map((linea) => {
              const base = linea.renglones.reduce((suma, renglon) => suma + renglon.baseCalculo, 0);
              return (
                <TarjetaFila
                  key={linea.vendedorId}
                  encabezado={
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="min-w-0 truncate font-medium">{linea.nombreCompleto}</p>
                      {!linea.activo ? <Badge variant="outline">inactivo</Badge> : null}
                    </div>
                  }
                  lateral={
                    <span className="text-base font-semibold text-foreground tabular-nums">
                      {pesos(linea.totalComision)}
                    </span>
                  }
                >
                  <DatoFila
                    etiqueta="Ventas nuevas"
                    valor={`${linea.ventasNuevas}${
                      linea.tramo
                        ? ` · tramo ${linea.tramo.ventasMin}${
                            linea.tramo.ventasMax === null ? "+" : ` a ${linea.tramo.ventasMax}`
                          }`
                        : ""
                    }`}
                  />
                  <DatoFila etiqueta="Base cobrada" valor={pesos(base)} />
                  <DatoFila etiqueta="Comisión" valor={pesos(linea.totalComisionCuotas)} />
                  <div className="flex items-center justify-between gap-3 pt-1">
                    <span className="text-xs text-muted-foreground">Gastos repr.</span>
                    <InputGastos
                      vendedorId={linea.vendedorId}
                      periodo={periodo}
                      valor={linea.gastosRepresentacion}
                      deshabilitado={cerrado}
                    />
                  </div>
                  <Button variant="outline" size="lg" asChild className="mt-2 w-full">
                    <Link href={`/admin/comisiones/vendedor/${linea.vendedorId}?periodo=${periodo}`}>
                      Ver el detalle
                    </Link>
                  </Button>
                </TarjetaFila>
              );
            })}
          </ListaTarjetas>

        <Card className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendedor</TableHead>
                <TableHead className="text-right">Ventas nuevas</TableHead>
                <TableHead>Tramo</TableHead>
                <TableHead>Cobra hasta</TableHead>
                <TableHead className="text-right">Base</TableHead>
                <TableHead className="text-right">Comisión</TableHead>
                <TableHead className="text-right">Gastos repr.</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="w-0" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {conMovimiento.map((linea) => {
                const base = linea.renglones.reduce(
                  (suma, renglon) => suma + renglon.baseCalculo,
                  0
                );

                return (
                  <TableRow key={linea.vendedorId}>
                    <TableCell className="font-medium">
                      {linea.nombreCompleto}
                      {!linea.activo ? (
                        <Badge variant="outline" className="ml-2">
                          inactivo
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {linea.ventasNuevas}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {linea.tramo
                        ? linea.tramo.ventasMax === null
                          ? `${linea.tramo.ventasMin} o más`
                          : `${linea.tramo.ventasMin} a ${linea.tramo.ventasMax}`
                        : cerrado
                          ? "—"
                          : "sin tramo"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      c{linea.topeCuotasComision}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {pesos(base)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {pesos(linea.totalComisionCuotas)}
                    </TableCell>
                    <TableCell className="text-right">
                      <InputGastos
                        vendedorId={linea.vendedorId}
                        periodo={periodo}
                        valor={linea.gastosRepresentacion}
                        deshabilitado={cerrado}
                      />
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {pesos(linea.totalComision)}
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" asChild>
                        <Link
                          href={`/admin/comisiones/vendedor/${linea.vendedorId}?periodo=${periodo}`}
                        >
                          Detalle
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
        </>
      )}

      {sinMovimiento.length > 0 ? (
        <Card className="mt-4">
          <CardContent className="py-4">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Sin movimiento en {etiqueta}:</span>
              {sinMovimiento.map((linea) => (
                <Link
                  key={linea.vendedorId}
                  href={`/admin/comisiones/vendedor/${linea.vendedorId}?periodo=${periodo}`}
                  className="hover:text-foreground hover:underline"
                >
                  {linea.nombreCompleto}
                </Link>
              ))}
            </p>
            {!cerrado ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Si a alguno hay que pagarle gastos de representación igual, entrá a su
                detalle y cargalos ahí.
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}
