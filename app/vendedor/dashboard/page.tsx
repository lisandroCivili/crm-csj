import Link from "next/link";
import { BadgeDollarSign, CalendarClock, ClipboardList, Plus, ScrollText } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/layout/stat-card";
import { BadgeEstado } from "@/components/leads/badge-estado";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { obtenerLiquidacionVendedor } from "@/lib/comisiones/liquidacion";
import { etiquetaPeriodo, periodoActual, periodoAnterior } from "@/lib/comisiones/periodo";
import { db } from "@/lib/db";
import { pesos, porcentaje } from "@/lib/formato";
import { requireVendedor } from "@/lib/sesion";

const FECHA = new Intl.DateTimeFormat("es-AR", { timeZone: "UTC" });
const DIA_LARGO = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

export default async function VendedorDashboardPage() {
  const usuario = await requireVendedor();

  const ahora = new Date();
  const inicioDeMes = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), 1));
  const cierreDeMes = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth() + 1, 0));
  const diasParaCierre = Math.max(
    0,
    Math.ceil((cierreDeMes.getTime() - ahora.getTime()) / 86_400_000)
  );

  const periodo = periodoActual();
  const periodoPrevio = periodoAnterior(periodo);

  const [vendedor, leadsPendientes, ventasDelMes, ventasTotales, ultimosLeads, ultimasVentas] =
    await Promise.all([
      db.vendedor.findUniqueOrThrow({
        where: { id: usuario.vendedorId },
        select: { topeCuotasComision: true },
      }),
      db.lead.count({ where: { vendedorAsignadoId: usuario.vendedorId, estado: "PENDIENTE" } }),
      db.venta.count({
        where: {
          vendedorId: usuario.vendedorId,
          estado: "ACTIVA",
          fechaVenta: { gte: inicioDeMes },
        },
      }),
      db.venta.count({ where: { vendedorId: usuario.vendedorId, estado: "ACTIVA" } }),
      db.lead.findMany({
        where: { vendedorAsignadoId: usuario.vendedorId, estado: "PENDIENTE" },
        orderBy: { fechaAsignacion: "desc" },
        take: 5,
        select: { id: true, nombre: true, telefono: true, localidad: true, estado: true },
      }),
      db.venta.findMany({
        where: { vendedorId: usuario.vendedorId },
        orderBy: { fechaVenta: "desc" },
        take: 5,
        select: { id: true, nombreCliente: true, fechaVenta: true, codigoProducto: true },
      }),
    ]);

  // La comision del vendedor sale del padron, no de las ventas que carga acá:
  // se cuenta cuando el club confirma que la cuota se cobro.
  const [comision, comisionPrevia] = usuario.zonaIdFija
    ? await Promise.all([
        obtenerLiquidacionVendedor({
          vendedorId: usuario.vendedorId,
          zonaId: usuario.zonaIdFija,
          periodo,
        }),
        obtenerLiquidacionVendedor({
          vendedorId: usuario.vendedorId,
          zonaId: usuario.zonaIdFija,
          periodo: periodoPrevio,
        }),
      ])
    : [null, null];

  const cerrada = comision?.estado === "CERRADO";

  return (
    <>
      <PageHeader
        titulo={`Hola, ${usuario.nombre.split(" ")[0]}`}
        descripcion="Cómo venís este mes."
        acciones={
          <Button asChild>
            <Link href="/vendedor/ventas/nueva">
              <Plus className="size-4" />
              Nueva venta
            </Link>
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          etiqueta="Leads por trabajar"
          valor={leadsPendientes}
          detalle="pendientes de contactar"
          icono={ClipboardList}
          tono={leadsPendientes > 0 ? "atencion" : "neutro"}
          href="/vendedor/leads?estado=PENDIENTE"
        />
        <StatCard
          etiqueta="Ventas del mes"
          valor={ventasDelMes}
          detalle={`${ventasTotales} en total`}
          icono={ScrollText}
          tono="exito"
          href="/vendedor/ventas"
        />
        <StatCard
          etiqueta={cerrada ? "Ganancia del mes" : "Ganancia estimada"}
          valor={pesos(comision?.totalComision ?? 0)}
          detalle={
            cerrada
              ? "liquidada y cerrada"
              : `provisorio · cobrás hasta c${vendedor.topeCuotasComision}`
          }
          icono={BadgeDollarSign}
          tono="marca"
        />
        <StatCard
          etiqueta="Cierre del mes"
          valor={DIA_LARGO.format(cierreDeMes)}
          detalle={diasParaCierre === 0 ? "cierra hoy" : `faltan ${diasParaCierre} días`}
          icono={CalendarClock}
        />
      </div>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base">
            Tu comisión de <span className="first-letter:uppercase">{etiquetaPeriodo(periodo)}</span>
          </CardTitle>
          <CardDescription>
            Se calcula sobre las cuotas que el padrón mostró cobradas este mes, agrupadas por
            número de cuota. Hasta que se cierre el mes, el número puede moverse.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!comision || comision.renglones.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">
              Todavía no hay cuotas tuyas cobradas este mes. El padrón del ciclo llega unos
              diez días después del sorteo.
            </p>
          ) : (
            <ul className="divide-y">
              {comision.renglones.map((renglon) => (
                <li
                  key={renglon.numeroCuota}
                  className="flex items-center justify-between gap-3 py-2.5 text-sm"
                >
                  <span>
                    <span className="font-medium">Cuota {renglon.numeroCuota}</span>
                    <span className="text-muted-foreground">
                      {" · "}
                      {renglon.cantidadCuotas}{" "}
                      {renglon.cantidadCuotas === 1 ? "cobrada" : "cobradas"} ·{" "}
                      {porcentaje(renglon.porcentajeAplicado)} de{" "}
                      {pesos(renglon.baseCalculo)}
                    </span>
                  </span>
                  <span className="shrink-0 tabular-nums">{pesos(renglon.monto)}</span>
                </li>
              ))}
            </ul>
          )}

          {comision && comision.gastosRepresentacion > 0 ? (
            <div className="flex items-center justify-between gap-3 border-t py-2.5 text-sm">
              <span className="text-muted-foreground">Gastos de representación</span>
              <span className="tabular-nums">
                {pesos(comision.gastosRepresentacion)}
              </span>
            </div>
          ) : null}

          <Separator className="my-3" />

          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">
              {cerrada ? "Total liquidado" : "Total estimado"}
            </span>
            <span className="text-xl font-semibold tabular-nums">
              {pesos(comision?.totalComision ?? 0)}
            </span>
          </div>

          {comisionPrevia && comisionPrevia.totalComision > 0 ? (
            <p className="mt-3 text-xs text-muted-foreground">
              El mes pasado ({etiquetaPeriodo(periodoPrevio)}) cerraste con{" "}
              {pesos(comisionPrevia.totalComision)}.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Leads para llamar</CardTitle>
            <CardDescription>Los últimos que te asignaron.</CardDescription>
          </CardHeader>
          <CardContent>
            {ultimosLeads.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">
                No tenés leads pendientes. Buen trabajo.
              </p>
            ) : (
              <ul className="divide-y">
                {ultimosLeads.map((lead) => (
                  <li key={lead.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <Link
                        href={`/vendedor/leads/${lead.id}`}
                        className="block truncate text-sm font-medium hover:underline"
                      >
                        {lead.nombre}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">
                        {[lead.telefono, lead.localidad].filter(Boolean).join(" · ") || "—"}
                      </p>
                    </div>
                    <BadgeEstado estado={lead.estado} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Últimas ventas</CardTitle>
            <CardDescription>
              La comisión se liquida sobre las cuotas que efectivamente se cobren.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {ultimasVentas.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">
                Todavía no cargaste ninguna venta.
              </p>
            ) : (
              <ul className="divide-y">
                {ultimasVentas.map((venta) => (
                  <li key={venta.id} className="flex items-center justify-between gap-3 py-2.5">
                    <Link
                      href={`/vendedor/ventas/${venta.id}`}
                      className="min-w-0 truncate text-sm font-medium hover:underline"
                    >
                      {venta.nombreCliente}
                    </Link>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      {venta.codigoProducto ? `${venta.codigoProducto} · ` : ""}
                      {FECHA.format(venta.fechaVenta)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
