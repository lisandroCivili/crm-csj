import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Lock, TriangleAlert, UserSquare } from "lucide-react";
import { InputGastos } from "@/components/comisiones/input-gastos";
import { PageHeader } from "@/components/layout/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cuotasDelPeriodo, obtenerLiquidacionVendedor } from "@/lib/comisiones/liquidacion";
import { esPeriodoValido, etiquetaPeriodo, periodoActual } from "@/lib/comisiones/periodo";
import { pesos, porcentaje } from "@/lib/formato";
import { requireAdmin, requireZonaActivaId } from "@/lib/sesion";

const FECHA = new Intl.DateTimeFormat("es-AR", { timeZone: "UTC" });
const FECHA_HORA = new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" });

export default async function DetalleComisionPage({
  params,
  searchParams,
}: PageProps<"/admin/comisiones/vendedor/[id]">) {
  await requireAdmin();
  const zonaId = await requireZonaActivaId();

  const { id } = await params;
  const parametros = await searchParams;
  const pedido = typeof parametros.periodo === "string" ? parametros.periodo : "";
  const periodo = esPeriodoValido(pedido) ? pedido : periodoActual();

  const linea = await obtenerLiquidacionVendedor({ vendedorId: id, zonaId, periodo });
  if (!linea) notFound();

  const cuotas = await cuotasDelPeriodo({ vendedorId: id, zonaId, periodo });
  const etiqueta = etiquetaPeriodo(periodo);
  const cerrado = linea.estado === "CERRADO";
  const base = linea.renglones.reduce((suma, renglon) => suma + renglon.baseCalculo, 0);

  return (
    <>
      <PageHeader
        titulo={linea.nombreCompleto}
        descripcion={`Comisión de ${etiqueta} · código ${linea.codigo}`}
        acciones={
          <>
            <Button variant="outline" asChild>
              <Link href={`/admin/comisiones?periodo=${periodo}`}>
                <ArrowLeft className="size-4" />
                Volver
              </Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href={`/admin/vendedores/${linea.vendedorId}`}>
                <UserSquare className="size-4" />
                Perfil
              </Link>
            </Button>
          </>
        }
      />

      {linea.advertencias.length > 0 ? (
        <Alert variant="destructive" className="mb-6">
          <TriangleAlert />
          <AlertTitle>Falta cargar escala</AlertTitle>
          <AlertDescription>
            <ul className="list-disc space-y-1 pl-4">
              {linea.advertencias.map((aviso) => (
                <li key={aviso}>{aviso}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Cómo se llega al total</CardTitle>
            <CardDescription>
              Un renglón por número de cuota: se suman los importes cobrados y se les aplica
              el porcentaje del tramo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {linea.renglones.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">
                No cobró ninguna cuota en {etiqueta}.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cuota</TableHead>
                    <TableHead className="text-right">Cuotas cobradas</TableHead>
                    <TableHead className="text-right">Base</TableHead>
                    <TableHead className="text-right">%</TableHead>
                    <TableHead className="text-right">Comisión</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {linea.renglones.map((renglon) => (
                    <TableRow key={renglon.numeroCuota}>
                      <TableCell className="font-medium">c{renglon.numeroCuota}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {renglon.cantidadCuotas}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {pesos(renglon.baseCalculo)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {renglon.porcentajeAplicado === 0 ? (
                          <span className="text-destructive">
                            {porcentaje(renglon.porcentajeAplicado)}
                          </span>
                        ) : (
                          porcentaje(renglon.porcentajeAplicado)
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {pesos(renglon.monto)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            <Separator className="my-5" />

            <dl className="ml-auto max-w-sm space-y-2 text-sm">
              <div className="flex justify-between gap-6">
                <dt className="text-muted-foreground">Base cobrada</dt>
                <dd className="tabular-nums">{pesos(base)}</dd>
              </div>
              <div className="flex justify-between gap-6">
                <dt className="text-muted-foreground">Comisión por cuotas</dt>
                <dd className="tabular-nums">{pesos(linea.totalComisionCuotas)}</dd>
              </div>
              <div className="flex items-center justify-between gap-6">
                <dt className="text-muted-foreground">Gastos de representación</dt>
                <dd>
                  <InputGastos
                    vendedorId={linea.vendedorId}
                    periodo={periodo}
                    valor={linea.gastosRepresentacion}
                    deshabilitado={cerrado}
                  />
                </dd>
              </div>
              <Separator />
              <div className="flex justify-between gap-6 text-base font-semibold">
                <dt>Total</dt>
                <dd className="tabular-nums">{pesos(linea.totalComision)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Datos del cálculo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Estado</span>
              {cerrado ? (
                <Badge variant="secondary" className="gap-1.5">
                  <Lock className="size-3" />
                  Cerrado
                </Badge>
              ) : (
                <Badge variant="outline">Borrador</Badge>
              )}
            </div>
            {linea.fechaCierre ? (
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Cerrado el</span>
                <span>{FECHA_HORA.format(linea.fechaCierre)}</span>
              </div>
            ) : null}
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Ventas nuevas del mes</span>
              <span className="tabular-nums">{linea.ventasNuevas}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Tramo aplicado</span>
              <span>
                {linea.tramo
                  ? linea.tramo.ventasMax === null
                    ? `${linea.tramo.ventasMin} o más`
                    : `${linea.tramo.ventasMin} a ${linea.tramo.ventasMax}`
                  : "—"}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Cobra hasta</span>
              <span>c{linea.topeCuotasComision}</span>
            </div>
            {linea.cuotasFueraDeTope > 0 ? (
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Cuotas fuera de tope</span>
                <span className="tabular-nums">
                  {linea.cuotasFueraDeTope} · {pesos(linea.baseFueraDeTope)}
                </span>
              </div>
            ) : null}

            <Separator />

            <p className="text-xs leading-relaxed text-muted-foreground">
              Una cuota entra en el mes en que el padrón la mostró cobrada por primera vez, no
              en el mes de la fecha de pago: la comisión se devenga cuando el club confirma el
              cobro.
            </p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">Cuotas que entraron</CardTitle>
            <CardDescription>
              Las que el padrón mostró cobradas en {etiqueta}
              {cuotas.length >= 300 ? " (se muestran las primeras 300)" : ""}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {cuotas.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">Ninguna.</p>
            ) : (
              <div className="max-h-[28rem] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Título</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead className="text-right">Cuota</TableHead>
                      <TableHead className="text-right">Importe</TableHead>
                      <TableHead>Fecha de pago</TableHead>
                      <TableHead>Detectada</TableHead>
                      <TableHead className="text-right">Comisiona</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cuotas.map((cuota) => {
                      const dentroDelTope = cuota.numeroCuota <= linea.topeCuotasComision;
                      return (
                        <TableRow key={cuota.id} className={dentroDelTope ? "" : "opacity-55"}>
                          <TableCell className="font-mono text-xs">
                            {cuota.titulo.numTit}
                          </TableCell>
                          <TableCell className="max-w-56 truncate">
                            {cuota.titulo.cliente.nombre}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            c{cuota.numeroCuota}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {pesos(Number(cuota.importe))}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {cuota.fechaPago ? FECHA.format(cuota.fechaPago) : "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {cuota.detectadaPagaAt ? FECHA.format(cuota.detectadaPagaAt) : "—"}
                          </TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground">
                            {dentroDelTope ? "sí" : `no, pasa c${linea.topeCuotasComision}`}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
