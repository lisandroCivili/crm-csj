import Link from "next/link";
import {
  BadgeDollarSign,
  ChevronLeft,
  ChevronRight,
  Info,
  Landmark,
  Lock,
  Percent,
  Sigma,
  Target,
  TriangleAlert,
  Users,
} from "lucide-react";
import {
  CerrarPeriodoAgente,
  ReabrirPeriodoAgente,
} from "@/components/comisiones/acciones-periodo-agente";
import { InputGastosAgente } from "@/components/comisiones/input-gastos-agente";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/layout/stat-card";
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
import { obtenerLiquidacion } from "@/lib/comisiones/liquidacion";
import { cuotasPorNumero, obtenerLiquidacionAgente } from "@/lib/comisiones/liquidacionAgente";
import {
  esPeriodoValido,
  etiquetaPeriodo,
  periodoActual,
  periodoAnterior,
} from "@/lib/comisiones/periodo";
import { db } from "@/lib/db";
import { pesos, porcentaje } from "@/lib/formato";
import { requireAdmin, requireZonaActivaId } from "@/lib/sesion";

const FECHA = new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" });

/** "c1 a c2", "c5", "c61 en adelante". */
function rango(desde: number, hasta: number | null): string {
  if (hasta === null) return `c${desde} en adelante`;
  return desde === hasta ? `c${desde}` : `c${desde} a c${hasta}`;
}

export default async function ComisionAgentePage({
  searchParams,
}: PageProps<"/admin/comisiones/agente">) {
  await requireAdmin();
  const zonaId = await requireZonaActivaId();

  const parametros = await searchParams;
  const hoy = periodoActual();
  const pedido = typeof parametros.periodo === "string" ? parametros.periodo : "";
  const periodo = esPeriodoValido(pedido) ? pedido : hoy;

  const [zona, liquidacion, equipo, porCuota] = await Promise.all([
    db.zona.findUniqueOrThrow({ where: { id: zonaId }, select: { nombre: true } }),
    obtenerLiquidacionAgente({ zonaId, periodo }),
    obtenerLiquidacion({ zonaId, periodo }),
    cuotasPorNumero(zonaId, periodo),
  ]);

  const etiqueta = etiquetaPeriodo(periodo);
  const cerrado = liquidacion.estado === "CERRADO";

  // El margen es la comisión del club menos todo lo que sale hacia el equipo
  // (comisiones y sus gastos). Los gastos de representación del agente NO
  // entran: son un reintegro aparte, no ganancia (Balta, 27/08/2026).
  const alEquipo = equipo.totales.total;
  const margen = liquidacion.totalComision - alEquipo;

  const irA = (destino: string) => `/admin/comisiones/agente?periodo=${destino}`;
  const siguiente = periodoAnterior(periodo, -1);

  return (
    <>
      <PageHeader
        titulo="Comisión del agente"
        descripcion={`Lo que el club le paga a la agencia de ${zona.nombre} por las cuotas que el padrón mostró cobradas en el mes.`}
        acciones={
          <>
            <Button variant="outline" asChild>
              <Link href="/admin/comisiones">
                <Users className="size-4" />
                Comisión del equipo
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/admin/comisiones/agente/escala">
                <Percent className="size-4" />
                Contrato
              </Link>
            </Button>
            {cerrado ? (
              <ReabrirPeriodoAgente periodo={periodo} etiqueta={etiqueta} />
            ) : (
              <CerrarPeriodoAgente
                periodo={periodo}
                etiqueta={etiqueta}
                total={liquidacion.totalComision}
                deshabilitado={liquidacion.sinEscala || liquidacion.renglones.length === 0}
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
          <span className="min-w-44 text-center text-sm font-medium first-letter:uppercase">
            {etiqueta}
          </span>
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
            {liquidacion.fechaCierre ? ` · ${FECHA.format(liquidacion.fechaCierre)}` : ""}
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

      {liquidacion.sinEscala ? (
        <Alert className="mb-6">
          <TriangleAlert />
          <AlertTitle>Falta cargar el contrato de agencia</AlertTitle>
          <AlertDescription>
            <p>
              Sin tramos cargados no hay porcentaje que aplicar y la comisión del agente
              liquida en cero.
            </p>
            <Button size="sm" asChild className="mt-1">
              <Link href="/admin/comisiones/agente/escala">
                <Percent className="size-4" />
                Cargar el contrato
              </Link>
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {liquidacion.esLineaBase ? (
        <Alert className="mb-6">
          <Info />
          <AlertTitle>Este mes incluye la primera importación de la zona</AlertTitle>
          <AlertDescription>
            En la primera importación el sistema ve como recién cobradas todas las cuotas que ya
            venían pagadas de antes, así que este total está inflado y no sirve para liquidar.
            Los meses siguientes sí. Se nota más acá que en la comisión del equipo, porque el
            contrato de agencia no tiene tope de cuota.
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Si no hay escala, el cartel de arriba ya lo dice: repetirlo acá sería
          el mismo aviso dos veces. */}
      {!liquidacion.sinEscala && liquidacion.advertencias.length > 0 ? (
        <Alert
          variant={liquidacion.cuotasSinTramo > 0 ? "destructive" : "default"}
          className="mb-6"
        >
          <TriangleAlert />
          <AlertTitle>
            {liquidacion.cuotasSinTramo > 0 ? "Hay cuotas sin comisionar" : "Atención"}
          </AlertTitle>
          <AlertDescription>
            <ul className="list-disc space-y-1 pl-4">
              {liquidacion.advertencias.map((aviso) => (
                <li key={aviso}>{aviso}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          etiqueta="Comisión del club"
          valor={pesos(liquidacion.totalComision)}
          detalle={`sobre ${pesos(liquidacion.baseCobrada)} cobrados`}
          icono={Landmark}
          tono="exito"
        />
        <StatCard
          etiqueta="Cuotas cobradas"
          valor={liquidacion.cuotasCobradas.toLocaleString("es-AR")}
          detalle="todas las de la zona, sin tope de cuota"
          icono={Sigma}
        />
        <StatCard
          etiqueta="Se le paga al equipo"
          valor={pesos(alEquipo)}
          detalle={`${etiqueta} · ${equipo.estado === "CERRADO" ? "cerrado" : "en borrador"}`}
          icono={Users}
          href={`/admin/comisiones?periodo=${periodo}`}
        />
        <StatCard
          etiqueta="Margen de la agencia"
          valor={pesos(margen)}
          detalle="comisión del club menos lo del equipo"
          icono={BadgeDollarSign}
          tono={margen >= 0 ? "marca" : "atencion"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Cómo se llega al total</CardTitle>
            <CardDescription>
              Un renglón por tramo del contrato: se suman los importes cobrados de esas cuotas y
              se les aplica el porcentaje.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {liquidacion.renglones.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">
                No se cobró ninguna cuota en {etiqueta}. Una cuota entra en el mes en que el
                padrón la mostró cobrada por primera vez: si todavía no importaste el padrón de
                este ciclo, va a estar vacío.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tramo</TableHead>
                    <TableHead className="text-right">Cuotas cobradas</TableHead>
                    <TableHead className="text-right">Base</TableHead>
                    <TableHead className="text-right">%</TableHead>
                    <TableHead className="text-right">Comisión</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {liquidacion.renglones.map((renglon) => (
                    <TableRow key={renglon.cuotaDesde}>
                      <TableCell className="font-medium">
                        {rango(renglon.cuotaDesde, renglon.cuotaHasta)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {renglon.cantidadCuotas.toLocaleString("es-AR")}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {pesos(renglon.baseCalculo)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {porcentaje(renglon.porcentajeAplicado)}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {pesos(renglon.monto)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {liquidacion.cuotasSinTramo > 0 ? (
              <p className="mt-4 text-sm text-destructive">
                {liquidacion.cuotasSinTramo.toLocaleString("es-AR")} cuota(s) por{" "}
                {pesos(liquidacion.baseSinTramo)} no entraron en ningún tramo del contrato y no
                están comisionando.
              </p>
            ) : null}

            <Separator className="my-5" />

            <dl className="ml-auto max-w-sm space-y-2 text-sm">
              <div className="flex justify-between gap-6">
                <dt className="text-muted-foreground">Comisión del club</dt>
                <dd className="tabular-nums">{pesos(liquidacion.totalComision)}</dd>
              </div>
              <div className="flex items-center justify-between gap-6">
                <dt className="text-muted-foreground">Gastos de representación</dt>
                <dd>
                  <InputGastosAgente
                    periodo={periodo}
                    valor={liquidacion.gastosRepresentacion}
                    deshabilitado={cerrado}
                  />
                </dd>
              </div>
              <div className="flex justify-between gap-6">
                <dt className="text-muted-foreground">Se le paga al equipo</dt>
                <dd className="tabular-nums text-destructive">− {pesos(alEquipo)}</dd>
              </div>
              <Separator />
              <div className="flex justify-between gap-6 text-base font-semibold">
                <dt>Balance del mes</dt>
                <dd className="tabular-nums">
                  {pesos(liquidacion.totalComision + liquidacion.gastosRepresentacion - alEquipo)}
                </dd>
              </div>
            </dl>

            <p className="mt-3 text-right text-xs text-muted-foreground">
              Los gastos de representación no son comisión: el club los paga aparte y los
              aumenta por inflación. Por eso el margen de arriba no los incluye.
            </p>
          </CardContent>
        </Card>

        <div className="grid content-start gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="size-4 text-muted-foreground" />
                Contratos del mes
              </CardTitle>
              <CardDescription>Ventas nuevas y renovaciones, las dos cuentan.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Ventas nuevas</span>
                <span className="tabular-nums">{liquidacion.ventasNuevas}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Renovaciones</span>
                <span className="tabular-nums">{liquidacion.renovaciones}</span>
              </div>
              <Separator />
              <div className="flex justify-between gap-3 font-medium">
                <span>Total</span>
                <span className="tabular-nums">
                  {liquidacion.contratos} de {liquidacion.objetivoContratos}
                </span>
              </div>
              <Badge variant={liquidacion.cumpleObjetivo ? "secondary" : "outline"}>
                {liquidacion.cumpleObjetivo ? "Objetivo cumplido" : "Por debajo del objetivo"}
              </Badge>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Un contrato cuenta en el mes en que el sistema lo vio por primera vez al
                importar un padrón. Los títulos que ya venían de antes del sistema no cuentan.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cómo se calcula</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              <p>
                Entran todas las cuotas de {zona.nombre} que el padrón mostró cobradas en{" "}
                {etiqueta}, de cualquier vendedor y{" "}
                <strong className="font-medium text-foreground">sin tope de cuota</strong>.
              </p>
              <p className="text-xs">
                Una cuota se devenga en el mes en que el sistema la vio cobrada por primera vez,
                no en el mes de su fecha de pago: el padrón llega desfasado.
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">Detalle por número de cuota</CardTitle>
            <CardDescription>
              De dónde sale la base de cada tramo. Es lo cobrado en {etiqueta} según el padrón de
              hoy, así que en un período cerrado puede no coincidir con los renglones congelados.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {porCuota.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">Ninguna.</p>
            ) : (
              <div className="max-h-[24rem] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cuota</TableHead>
                      <TableHead className="text-right">Cobradas</TableHead>
                      <TableHead className="text-right">Base</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {porCuota.map((fila) => (
                      <TableRow key={fila.numeroCuota}>
                        <TableCell className="font-medium">c{fila.numeroCuota}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {fila.cantidad.toLocaleString("es-AR")}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {pesos(fila.base)}
                        </TableCell>
                      </TableRow>
                    ))}
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
