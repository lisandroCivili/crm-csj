import Link from "next/link";
import {
  BadgeDollarSign,
  ClipboardList,
  Coins,
  FileSpreadsheet,
  ScrollText,
  TrendingUp,
  UserSquare,
  Users,
} from "lucide-react";
import { CobranzaPorMes, type MesCobranza } from "@/components/dashboard/cobranza-por-mes";
import { FiltroCuota } from "@/components/dashboard/filtro-cuota";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/layout/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CUOTAS_COMISIONABLES } from "@/lib/comisiones/constantes";
import { obtenerLiquidacion, obtenerLiquidacionVendedor } from "@/lib/comisiones/liquidacion";
import { etiquetaPeriodo, periodoActual } from "@/lib/comisiones/periodo";
import { db } from "@/lib/db";
import { pesos } from "@/lib/formato";
import { getVendedorDelAdmin, requireAdmin, requireZonaActivaId } from "@/lib/sesion";

const FECHA = new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" });

export default async function AdminDashboardPage({
  searchParams,
}: PageProps<"/admin/dashboard">) {
  const usuario = await requireAdmin();
  const zonaId = await requireZonaActivaId();

  const parametros = await searchParams;
  const pedida = Number(parametros.cuota);
  const cuota = (CUOTAS_COMISIONABLES as readonly number[]).includes(pedida) ? pedida : null;
  // El filtro por numero de cuota afecta a la cobranza y al promedio, no a los
  // leads ni a las ventas cargadas: esas no tienen numero de cuota.
  const filtroCuota = cuota === null ? {} : { numeroCuota: cuota };

  const periodo = periodoActual();

  const inicioDeMes = new Date();
  inicioDeMes.setUTCDate(1);
  inicioDeMes.setUTCHours(0, 0, 0, 0);

  const [
    leadsPendientes,
    leadsSinAsignar,
    clientes,
    titulos,
    vendedores,
    ventasDelMes,
    ultimoPadron,
    cuotasPorMes,
    cuotasPagasPorMes,
    topVendedores,
    liquidacion,
    fichaPropia,
  ] = await Promise.all([
    db.lead.count({ where: { zonaId, estado: "PENDIENTE" } }),
    db.lead.count({ where: { zonaId, vendedorAsignadoId: null } }),
    db.cliente.count({ where: { zonaId } }),
    db.titulo.count({ where: { zonaId, activo: true } }),
    db.vendedor.count({ where: { zonaId, activo: true } }),
    db.venta.count({ where: { zonaId, estado: "ACTIVA", fechaVenta: { gte: inicioDeMes } } }),
    db.padronImport.findFirst({
      where: { zonaId },
      orderBy: { createdAt: "desc" },
      include: { importadoPor: { select: { nombre: true } } },
    }),
    db.tituloCuota.groupBy({
      by: ["periodoEmision"],
      where: { titulo: { zonaId }, ...filtroCuota },
      _count: { _all: true },
      orderBy: { periodoEmision: "desc" },
      take: 8,
    }),
    db.tituloCuota.groupBy({
      by: ["periodoEmision"],
      where: { titulo: { zonaId }, fechaPago: { not: null }, ...filtroCuota },
      _count: { _all: true },
    }),
    db.venta.groupBy({
      by: ["vendedorId"],
      where: { zonaId, estado: "ACTIVA", fechaVenta: { gte: inicioDeMes } },
      _count: { _all: true },
      orderBy: { _count: { vendedorId: "desc" } },
      take: 5,
    }),
    obtenerLiquidacion({ zonaId, periodo }),
    getVendedorDelAdmin(),
  ]);

  // Balta y Pedro venden ademas de administrar. Si tienen ficha en esta zona, lo
  // primero que quieren ver es lo suyo, no el total del equipo.
  //
  // Ojo: esto es lo que cobran por sus propios titulos, con la escala de
  // vendedor. Lo que el club les paga como agentes —sobre toda la produccion,
  // con la escala del contrato de agencia— es otro numero y todavia no existe.
  const comisionPropia = fichaPropia
    ? await obtenerLiquidacionVendedor({
        vendedorId: fichaPropia.id,
        zonaId,
        periodo,
      })
    : null;

  const pagasPorPeriodo = new Map(
    cuotasPagasPorMes.map((fila) => [fila.periodoEmision.getTime(), fila._count._all])
  );

  const meses: MesCobranza[] = cuotasPorMes
    .map((fila) => ({
      periodo: fila.periodoEmision,
      total: fila._count._all,
      pagas: pagasPorPeriodo.get(fila.periodoEmision.getTime()) ?? 0,
    }))
    .reverse();

  // Cuánto se cobra en promedio por cuota, sobre los mismos meses que muestra
  // el gráfico: sirve para ver de qué tamaño es la base de la comisión.
  const desdeElGrafico = meses[0]?.periodo;
  const promedio = desdeElGrafico
    ? await db.tituloCuota.aggregate({
        where: {
          titulo: { zonaId },
          fechaPago: { not: null },
          periodoEmision: { gte: desdeElGrafico },
          ...filtroCuota,
        },
        _avg: { importe: true },
      })
    : null;
  const promedioCuota = promedio?._avg.importe ? Number(promedio._avg.importe) : 0;

  const nombresVendedores = new Map(
    (
      await db.vendedor.findMany({
        where: { id: { in: topVendedores.map((v) => v.vendedorId) } },
        select: { id: true, nombreCompleto: true },
      })
    ).map((v) => [v.id, v.nombreCompleto])
  );

  const totalCuotas = meses.reduce((suma, mes) => suma + mes.total, 0);
  const totalPagas = meses.reduce((suma, mes) => suma + mes.pagas, 0);
  const porcentajeCobrado = totalCuotas > 0 ? Math.round((totalPagas / totalCuotas) * 100) : 0;

  return (
    <>
      <PageHeader
        titulo={`Hola, ${usuario.nombre.split(" ")[0]}`}
        descripcion="Cómo viene la zona activa."
      />

      <div className="mb-5">
        <FiltroCuota base="/admin/dashboard" activa={cuota} />
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          etiqueta="Leads sin asignar"
          valor={leadsSinAsignar}
          detalle={`${leadsPendientes} pendientes de trabajar`}
          icono={ClipboardList}
          tono={leadsSinAsignar > 0 ? "atencion" : "neutro"}
          href="/admin/leads?asignacion=sin"
        />
        <StatCard
          etiqueta={cuota ? `Cobranza de la cuota ${cuota}` : "Cobranza acumulada"}
          valor={`${porcentajeCobrado}%`}
          detalle={`${totalPagas.toLocaleString("es-AR")} de ${totalCuotas.toLocaleString("es-AR")} cuotas emitidas`}
          icono={TrendingUp}
          tono="exito"
        />
        <StatCard
          etiqueta="Promedio de cuota"
          valor={pesos(promedioCuota)}
          detalle={
            cuota
              ? `lo que se cobra por cada cuota ${cuota}`
              : "sobre las cuotas cobradas del gráfico"
          }
          icono={Coins}
        />
        <StatCard
          etiqueta="Ventas del mes"
          valor={ventasDelMes}
          detalle="cargadas por el equipo"
          icono={ScrollText}
          tono="marca"
          href="/admin/ventas"
        />
        {comisionPropia ? (
          <StatCard
            etiqueta="Mi comisión del mes"
            valor={pesos(comisionPropia.totalComision)}
            detalle={`${etiquetaPeriodo(periodo)} · ${comisionPropia.ventasNuevas} venta${
              comisionPropia.ventasNuevas === 1 ? "" : "s"
            } nueva${comisionPropia.ventasNuevas === 1 ? "" : "s"}`}
            icono={BadgeDollarSign}
            tono="marca"
            href={`/admin/comisiones/vendedor/${comisionPropia.vendedorId}?periodo=${periodo}`}
          />
        ) : null}

        <StatCard
          etiqueta={comisionPropia ? "Comisiones del equipo" : "Comisiones del mes"}
          valor={pesos(liquidacion.totales.total)}
          detalle={`${etiquetaPeriodo(periodo)} · ${
            liquidacion.estado === "CERRADO" ? "cerrado" : "en borrador"
          }`}
          icono={BadgeDollarSign}
          href="/admin/comisiones"
        />
        <StatCard
          etiqueta="Clientes en padrón"
          valor={clientes}
          detalle={`${titulos.toLocaleString("es-AR")} títulos activos`}
          icono={Users}
          href="/admin/clientes"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">
              Cobranza mes a mes{cuota ? ` · cuota ${cuota}` : ""}
            </CardTitle>
            <CardDescription>
              Qué porcentaje de las cuotas emitidas figura pago en el padrón.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CobranzaPorMes meses={meses} />
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Último padrón</CardTitle>
            </CardHeader>
            <CardContent>
              {ultimoPadron ? (
                <div className="space-y-3">
                  <p className="truncate text-sm font-medium">{ultimoPadron.archivoNombre}</p>
                  <p className="text-xs text-muted-foreground">
                    {ultimoPadron.importadoPor.nombre} · {FECHA.format(ultimoPadron.createdAt)}
                  </p>
                  <dl className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <dt className="text-xs text-muted-foreground">Cuotas nuevas</dt>
                      <dd className="text-lg font-semibold tabular-nums">
                        {ultimoPadron.cuotasNuevas.toLocaleString("es-AR")}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Recién cobradas</dt>
                      <dd className="text-lg font-semibold tabular-nums text-success">
                        {ultimoPadron.cuotasReciePagadas.toLocaleString("es-AR")}
                      </dd>
                    </div>
                  </dl>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Todavía no importaste ningún padrón.
                  </p>
                  <Button size="sm" asChild>
                    <Link href="/admin/padron/importar">
                      <FileSpreadsheet className="size-4" />
                      Importar el primero
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ventas del mes por vendedor</CardTitle>
            </CardHeader>
            <CardContent>
              {topVendedores.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Sin ventas cargadas este mes.
                </p>
              ) : (
                <ul className="space-y-2.5">
                  {topVendedores.map((fila) => (
                    <li key={fila.vendedorId} className="flex items-center justify-between gap-3">
                      <Link
                        href={`/admin/vendedores/${fila.vendedorId}`}
                        className="min-w-0 truncate text-sm hover:underline"
                      >
                        {nombresVendedores.get(fila.vendedorId) ?? "—"}
                      </Link>
                      <span className="shrink-0 text-sm font-semibold tabular-nums">
                        {fila._count._all}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Equipo</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Vendedores activos</span>
              <span className="flex items-center gap-2 text-lg font-semibold tabular-nums">
                <UserSquare className="size-4 text-muted-foreground" />
                {vendedores}
              </span>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
