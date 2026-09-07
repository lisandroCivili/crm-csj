import Link from "next/link";
import { ChevronLeft, ChevronRight, Lock, TriangleAlert } from "lucide-react";
import { DatoFila, ListaTarjetas, TarjetaFila } from "@/components/layout/lista-tarjetas";
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
import {
  cuotasDelPeriodo,
  obtenerLiquidacionVendedor,
  periodosDelVendedor,
} from "@/lib/comisiones/liquidacion";
import {
  esPeriodoValido,
  etiquetaPeriodo,
  periodoActual,
  periodoAnterior,
} from "@/lib/comisiones/periodo";
import { dia, diaDelPadron, momento, pesos, porcentaje } from "@/lib/formato";
import { requirePermiso, requireZonaActivaId } from "@/lib/sesion";

/** Cuántos meses de acceso directo se ofrecen debajo del navegador. */
const MESES_A_LA_MANO = 12;

/**
 * MI COMISIÓN
 *
 * La misma liquidación que ve Balta en `/admin/comisiones/vendedor/[id]`, pero
 * de quien la mira y sin las palancas que son del admin.
 *
 * NO SE ESCRIBE CÁLCULO NUEVO. `obtenerLiquidacionVendedor` y `cuotasDelPeriodo`
 * son los mismos que usan la pantalla del admin y el dashboard. Es la razón de
 * ser de la pantalla: sirve para que el vendedor pueda discutir un peso, y no
 * podría si el número de acá saliera de otra cuenta que el que le pagan.
 *
 * EL ALCANCE SALE DE LA SESIÓN, NUNCA DE LA URL. El admin recibe el vendedor
 * por `[id]` porque mira a otros; acá el único id posible es el propio, así que
 * la ruta no lo lleva y no hay nada que validar. Lo único que viaja por query
 * es el período, y `esPeriodoValido` lo filtra.
 *
 * TRES DIFERENCIAS DELIBERADAS con la pantalla del admin:
 *
 *  - los gastos de representación se ven pero no se editan: `InputGastos` es
 *    del admin, porque es plata que decide Balta;
 *  - no se muestra el nombre de la escala. Cuál escala le toca a quién es una
 *    decisión interna de la agencia y no un dato del vendedor; el tramo y el
 *    porcentaje sí se muestran, porque son la explicación del número;
 *  - cada título linkea a su ficha de la cartera, que es lo que convierte el
 *    total en algo verificable: de acá salió, ese es el cliente, esa la cuota.
 */
export default async function ComisionVendedorPage({
  searchParams,
}: PageProps<"/vendedor/comision">) {
  const usuario = await requirePermiso("verComision");
  // Para el vendedor esto devuelve la zona de su ficha: la cookie no lo mueve.
  const zonaId = await requireZonaActivaId();

  const parametros = await searchParams;
  const hoy = periodoActual();
  const pedido = typeof parametros.periodo === "string" ? parametros.periodo : "";
  const periodo = esPeriodoValido(pedido) ? pedido : hoy;

  const [linea, cuotas, periodosConCobro] = await Promise.all([
    obtenerLiquidacionVendedor({ vendedorId: usuario.vendedorId, zonaId, periodo }),
    cuotasDelPeriodo({ vendedorId: usuario.vendedorId, zonaId, periodo }),
    periodosDelVendedor({ vendedorId: usuario.vendedorId, zonaId }),
  ]);

  // `obtenerLiquidacionVendedor` devuelve null si la ficha no existe en la
  // zona, que para el vendedor propio no puede pasar: `requirePermiso` ya
  // garantiza que la tiene. Igual no se asume, se muestra el mes en cero.
  const etiqueta = etiquetaPeriodo(periodo);
  const cerrada = linea?.estado === "CERRADO";
  const renglones = linea?.renglones ?? [];
  const base = renglones.reduce((suma, renglon) => suma + renglon.baseCalculo, 0);
  const tope = linea?.topeCuotasComision ?? 0;

  const irA = (destino: string) => `/vendedor/comision?periodo=${destino}`;
  const meses = periodosConCobro.filter((mes) => mes !== periodo).slice(0, MESES_A_LA_MANO);

  return (
    <>
      <PageHeader
        titulo="Mi comisión"
        descripcion="De dónde sale cada peso, cuota por cuota."
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" asChild>
            <Link href={irA(periodoAnterior(periodo))} aria-label="Mes anterior">
              <ChevronLeft className="size-4" />
            </Link>
          </Button>
          <span className="min-w-44 text-center text-sm font-medium first-letter:uppercase">
            {etiqueta}
          </span>
          {/* Adelante del mes en curso no hay nada que liquidar: las cuotas se
              devengan cuando el padrón las muestra cobradas, y ese padrón
              todavía no existe. */}
          <Button
            variant="outline"
            size="icon"
            asChild={periodo < hoy}
            disabled={periodo >= hoy}
            aria-label="Mes siguiente"
          >
            {periodo < hoy ? (
              <Link href={irA(periodoAnterior(periodo, -1))}>
                <ChevronRight className="size-4" />
              </Link>
            ) : (
              <ChevronRight className="size-4" />
            )}
          </Button>
        </div>

        {cerrada ? (
          <Badge variant="secondary" className="gap-1.5">
            <Lock className="size-3" />
            Cerrada{linea?.fechaCierre ? ` · ${momento(linea.fechaCierre)}` : ""}
          </Badge>
        ) : (
          <Badge variant="outline">Provisorio · se recalcula solo</Badge>
        )}

        {periodo !== hoy ? (
          <Button variant="ghost" size="sm" asChild>
            <Link href={irA(hoy)}>Ir al mes actual</Link>
          </Button>
        ) : null}
      </div>

      {/* Los meses que efectivamente le movieron algo. Sin esto, llegar a un mes
          de hace un año son doce clics en la flecha. */}
      {meses.length > 0 ? (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Meses con movimiento:</span>
          {meses.map((mes) => (
            <Button key={mes} variant="outline" size="sm" asChild>
              <Link href={irA(mes)} className="first-letter:uppercase">
                {etiquetaPeriodo(mes)}
              </Link>
            </Button>
          ))}
        </div>
      ) : null}

      {linea && linea.advertencias.length > 0 ? (
        <Alert className="mb-6">
          <TriangleAlert />
          <AlertTitle>El número todavía no está completo</AlertTitle>
          <AlertDescription>
            <p>
              Falta cargar la escala de comisiones para algunas de tus cuotas, así que abajo
              figuran al 0%. Avisale a Balta: cuando la cargue, este mes se recalcula solo.
            </p>
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Cómo se llega al total</CardTitle>
            <CardDescription>
              Un renglón por número de cuota: se suma lo que se cobró de esa cuota y se le
              aplica el porcentaje que te corresponde.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renglones.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">
                No se cobró ninguna cuota tuya en {etiqueta}. El padrón del ciclo llega unos
                diez días después del sorteo.
              </p>
            ) : (
              <>
                {/* En el celular la tabla de cinco columnas deja la comisión
                    cortada contra el borde, que es justo la columna que se vino
                    a mirar. Misma solución que los listados: renglones acá,
                    tabla de 768px para arriba. El renglón se lee igual que el
                    del dashboard, para no estrenar otro formato. */}
                <ul className="divide-y md:hidden">
                  {renglones.map((renglon) => (
                    <li
                      key={renglon.numeroCuota}
                      className="flex items-baseline justify-between gap-3 py-2.5 text-sm"
                    >
                      <span className="min-w-0">
                        <span className="font-medium">Cuota {renglon.numeroCuota}</span>
                        <span className="text-muted-foreground">
                          {" · "}
                          {renglon.cantidadCuotas}{" "}
                          {renglon.cantidadCuotas === 1 ? "cobrada" : "cobradas"}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {renglon.porcentajeAplicado === 0 ? (
                            <span className="text-destructive">
                              {porcentaje(renglon.porcentajeAplicado)}
                            </span>
                          ) : (
                            porcentaje(renglon.porcentajeAplicado)
                          )}{" "}
                          de {pesos(renglon.baseCalculo)}
                        </span>
                      </span>
                      <span className="shrink-0 font-medium tabular-nums">
                        {pesos(renglon.monto)}
                      </span>
                    </li>
                  ))}
                </ul>

                <Table className="hidden md:table">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cuota</TableHead>
                      <TableHead className="text-right">Cobradas</TableHead>
                      <TableHead className="text-right">Base</TableHead>
                      <TableHead className="text-right">%</TableHead>
                      <TableHead className="text-right">Comisión</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {renglones.map((renglon) => (
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
              </>
            )}

            <Separator className="my-5" />

            <dl className="ml-auto max-w-sm space-y-2 text-sm">
              <div className="flex justify-between gap-6">
                <dt className="text-muted-foreground">Se cobró</dt>
                <dd className="tabular-nums">{pesos(base)}</dd>
              </div>
              <div className="flex justify-between gap-6">
                <dt className="text-muted-foreground">Tu comisión por esas cuotas</dt>
                <dd className="tabular-nums">{pesos(linea?.totalComisionCuotas ?? 0)}</dd>
              </div>
              {/* Se muestran aunque estén en cero sólo si los hay: es un importe
                  que carga Balta a mano, no un renglón de todos los meses. */}
              {linea && linea.gastosRepresentacion > 0 ? (
                <div className="flex justify-between gap-6">
                  <dt className="text-muted-foreground">Gastos de representación</dt>
                  <dd className="tabular-nums">{pesos(linea.gastosRepresentacion)}</dd>
                </div>
              ) : null}
              <Separator />
              <div className="flex justify-between gap-6 text-base font-semibold">
                <dt>{cerrada ? "Total liquidado" : "Total estimado"}</dt>
                <dd className="tabular-nums">{pesos(linea?.totalComision ?? 0)}</dd>
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
              {cerrada ? (
                <Badge variant="secondary" className="gap-1.5">
                  <Lock className="size-3" />
                  Cerrada
                </Badge>
              ) : (
                <Badge variant="outline">Provisorio</Badge>
              )}
            </div>
            {linea?.fechaCierre ? (
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Cerrada el</span>
                <span>{momento(linea.fechaCierre)}</span>
              </div>
            ) : null}
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Ventas nuevas del mes</span>
              <span className="tabular-nums">{linea?.ventasNuevas ?? 0}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Tramo</span>
              <span>
                {linea?.tramo
                  ? linea.tramo.ventasMax === null
                    ? `${linea.tramo.ventasMin} o más`
                    : `${linea.tramo.ventasMin} a ${linea.tramo.ventasMax}`
                  : "—"}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Cobrás hasta</span>
              <span>c{tope}</span>
            </div>
            {linea && linea.cuotasFueraDeTope > 0 ? (
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
              cobro. Por eso una venta de agosto suele aparecer acá en septiembre.
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              El tramo se mide mes a mes, no acumulado: lo definen las ventas nuevas de{" "}
              <span className="first-letter:uppercase">{etiqueta}</span>. Una renovación no
              suma al tramo, pero sus cuotas comisionan igual.
            </p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">Las cuotas que entraron</CardTitle>
            <CardDescription>
              Las que el padrón mostró cobradas en {etiqueta}
              {cuotas.length >= 300 ? " (se muestran las primeras 300)" : ""}. Las que pasan
              c{tope} se ven atenuadas: no comisionan.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {cuotas.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">Ninguna.</p>
            ) : (
              <>
                <ListaTarjetas>
                  {cuotas.map((cuota) => {
                    const dentroDelTope = cuota.numeroCuota <= tope;
                    return (
                      <TarjetaFila
                        key={cuota.id}
                        // Sin el permiso de cartera el link rebotaría al
                        // dashboard: no se ofrece lo que no se puede dar.
                        href={
                          usuario.permisos.verCartera
                            ? `/vendedor/cartera/${cuota.titulo.id}`
                            : undefined
                        }
                        titulo={cuota.titulo.cliente.nombre}
                        lateral={`c${cuota.numeroCuota}`}
                        atenuada={!dentroDelTope}
                      >
                        <DatoFila etiqueta="Título" valor={cuota.titulo.numTit} />
                        <DatoFila etiqueta="Importe" valor={pesos(Number(cuota.importe))} />
                        <DatoFila
                          etiqueta="Fecha de pago"
                          valor={cuota.fechaPago ? diaDelPadron(cuota.fechaPago) : null}
                        />
                        <DatoFila
                          etiqueta="Comisiona"
                          valor={dentroDelTope ? "sí" : `no, pasa c${tope}`}
                        />
                      </TarjetaFila>
                    );
                  })}
                </ListaTarjetas>

                <div className="hidden max-h-[28rem] overflow-y-auto md:block">
                  <Table>
                    <TableHeader className="sticky top-0 bg-card">
                      <TableRow>
                        <TableHead>Título</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead className="text-right">Cuota</TableHead>
                        <TableHead className="text-right">Importe</TableHead>
                        <TableHead>Fecha de pago</TableHead>
                        <TableHead>La vimos cobrada</TableHead>
                        <TableHead className="text-right">Comisiona</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cuotas.map((cuota) => {
                        const dentroDelTope = cuota.numeroCuota <= tope;
                        return (
                          <TableRow key={cuota.id} className={dentroDelTope ? "" : "opacity-55"}>
                            <TableCell className="font-mono text-xs">
                              {usuario.permisos.verCartera ? (
                                <Link
                                  href={`/vendedor/cartera/${cuota.titulo.id}`}
                                  className="hover:underline"
                                >
                                  {cuota.titulo.numTit}
                                </Link>
                              ) : (
                                cuota.titulo.numTit
                              )}
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
                              {cuota.fechaPago ? diaDelPadron(cuota.fechaPago) : "—"}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {cuota.detectadaPagaAt ? dia(cuota.detectadaPagaAt) : "—"}
                            </TableCell>
                            <TableCell className="text-right text-xs text-muted-foreground">
                              {dentroDelTope ? "sí" : `no, pasa c${tope}`}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
