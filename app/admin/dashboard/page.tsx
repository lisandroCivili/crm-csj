import Link from "next/link";
import {
  ClipboardList,
  FileSpreadsheet,
  ScrollText,
  TrendingUp,
  UserSquare,
  Users,
} from "lucide-react";
import { CobranzaPorMes, type MesCobranza } from "@/components/dashboard/cobranza-por-mes";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/layout/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { requireAdmin, requireZonaActivaId } from "@/lib/sesion";

const FECHA = new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" });

export default async function AdminDashboardPage() {
  const usuario = await requireAdmin();
  const zonaId = await requireZonaActivaId();

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
      where: { titulo: { zonaId } },
      _count: { _all: true },
      orderBy: { periodoEmision: "desc" },
      take: 8,
    }),
    db.tituloCuota.groupBy({
      by: ["periodoEmision"],
      where: { titulo: { zonaId }, fechaPago: { not: null } },
      _count: { _all: true },
    }),
    db.venta.groupBy({
      by: ["vendedorId"],
      where: { zonaId, estado: "ACTIVA", fechaVenta: { gte: inicioDeMes } },
      _count: { _all: true },
      orderBy: { _count: { vendedorId: "desc" } },
      take: 5,
    }),
  ]);

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

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          etiqueta="Leads sin asignar"
          valor={leadsSinAsignar}
          detalle={`${leadsPendientes} pendientes de trabajar`}
          icono={ClipboardList}
          tono={leadsSinAsignar > 0 ? "atencion" : "neutro"}
          href="/admin/leads?asignacion=sin"
        />
        <StatCard
          etiqueta="Cobranza acumulada"
          valor={`${porcentajeCobrado}%`}
          detalle={`${totalPagas.toLocaleString("es-AR")} de ${totalCuotas.toLocaleString("es-AR")} cuotas emitidas`}
          icono={TrendingUp}
          tono="exito"
        />
        <StatCard
          etiqueta="Ventas del mes"
          valor={ventasDelMes}
          detalle="cargadas por el equipo"
          icono={ScrollText}
          tono="marca"
          href="/admin/ventas"
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
            <CardTitle className="text-base">Cobranza mes a mes</CardTitle>
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
