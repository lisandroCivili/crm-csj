import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Ban, FileText, IdCard, Pencil } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { AnularVenta, ReactivarVenta } from "@/components/ventas/acciones-venta";
import { HistorialVenta } from "@/components/ventas/historial-venta";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/lib/db";
import { requireAdmin, requireZonaActivaId } from "@/lib/sesion";

const FECHA = new Intl.DateTimeFormat("es-AR", { timeZone: "UTC" });
const FECHA_HORA = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "short",
  timeStyle: "short",
});

function Dato({ etiqueta, valor }: { etiqueta: string; valor: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{etiqueta}</dt>
      <dd className="mt-0.5 text-sm">
        {valor || <span className="text-muted-foreground">—</span>}
      </dd>
    </div>
  );
}

/**
 * La ficha de la venta para el admin. Es la misma que ve el vendedor, con el
 * alcance cambiado —cualquier venta de la zona activa, no solo las propias— y
 * dos cosas que son suyas: el vendedor a nombre de quien quedo, y anular.
 */
export default async function DetalleVentaAdminPage({
  params,
}: PageProps<"/admin/ventas/[id]">) {
  await requireAdmin();
  const zonaId = await requireZonaActivaId();
  const { id } = await params;

  const venta = await db.venta.findFirst({
    where: { id, zonaId },
    include: {
      vendedor: { select: { id: true, nombreCompleto: true, codigo: true } },
      plan: { select: { nombre: true, duracionMeses: true } },
      titulo: { select: { id: true, numTit: true } },
      lead: { select: { id: true, nombre: true } },
      anuladaPor: { select: { nombre: true } },
      adjuntos: { orderBy: { createdAt: "desc" } },
      historial: {
        orderBy: { createdAt: "desc" },
        include: { modificadoPor: { select: { nombre: true } } },
      },
    },
  });

  if (!venta) notFound();

  const anulada = venta.estado === "ANULADA";
  const dni = venta.adjuntos.find((adjunto) => adjunto.tipo === "DNI");
  const contrato = venta.adjuntos.find((adjunto) => adjunto.tipo === "CONTRATO");

  return (
    <>
      <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
        <Link href="/admin/ventas">
          <ArrowLeft className="size-4" />
          Ventas
        </Link>
      </Button>

      <PageHeader
        titulo={venta.nombreCliente}
        descripcion={`DNI ${venta.dni} · ${FECHA.format(venta.fechaVenta)} · ${venta.vendedor.nombreCompleto}`}
        acciones={
          <div className="flex flex-wrap gap-2">
            {anulada ? (
              <ReactivarVenta ventaId={venta.id} />
            ) : (
              <>
                <Button variant="outline" asChild>
                  <Link href={`/admin/ventas/${venta.id}/editar`}>
                    <Pencil className="size-4" />
                    Editar
                  </Link>
                </Button>
                <AnularVenta ventaId={venta.id} />
              </>
            )}
          </div>
        }
      />

      {anulada ? (
        <Alert className="mb-4">
          <Ban />
          <AlertTitle>Venta anulada</AlertTitle>
          <AlertDescription>
            <span>
              {venta.anuladaPor?.nombre ?? "Alguien"} la anuló
              {venta.anuladaAt ? ` el ${FECHA_HORA.format(venta.anuladaAt)}` : ""}
              {venta.motivoAnulacion ? `: ${venta.motivoAnulacion}` : "."}
            </span>
            <span className="text-muted-foreground">
              No se puede editar hasta que se reactive. Las comisiones no cambian: salen
              del padrón, no de las ventas cargadas acá.
            </span>
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2">
              <Dato etiqueta="Teléfono" valor={venta.telefono} />
              <Dato etiqueta="Calle Nro y Barrio" valor={venta.direccion} />
              {/* Localidad y provincia salieron del formulario, pero las ventas
                  cargadas antes las tienen: se muestran solo si hay algo. */}
              {venta.localidad ? (
                <Dato etiqueta="Localidad" valor={venta.localidad} />
              ) : null}
              {venta.provincia ? (
                <Dato etiqueta="Provincia" valor={venta.provincia} />
              ) : null}
              <Dato
                etiqueta="Vendedor"
                valor={
                  <Link
                    href={`/admin/vendedores/${venta.vendedor.id}`}
                    className="underline underline-offset-2"
                  >
                    {venta.vendedor.nombreCompleto}
                  </Link>
                }
              />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2">
              <Dato etiqueta="Código de producto" valor={venta.codigoProducto} />
              <Dato etiqueta="Producto" valor={venta.plan?.nombre} />
              <Dato
                etiqueta="Duración"
                valor={venta.plan?.duracionMeses ? `${venta.plan.duracionMeses} meses` : null}
              />
              <Dato
                etiqueta="Nro Suscripción"
                valor={
                  venta.nroSuscripcion ? (
                    <span className="tabular-nums">{venta.nroSuscripcion}</span>
                  ) : null
                }
              />
              <Dato
                etiqueta="Título"
                valor={
                  venta.numeroTitulo ? (
                    <span className="tabular-nums">{venta.numeroTitulo}</span>
                  ) : (
                    <span className="text-muted-foreground">
                      el club todavía no lo asignó
                    </span>
                  )
                }
              />
              {/* Distinto del anterior: este es el titulo que el sistema
                  encontro en el padron, no el que anoto el vendedor. */}
              <Dato
                etiqueta="Título en el padrón"
                valor={
                  venta.titulo ? (
                    <span className="tabular-nums">{venta.titulo.numTit}</span>
                  ) : (
                    <span className="text-muted-foreground">
                      todavía no apareció en el padrón
                    </span>
                  )
                }
              />
              {venta.lead ? (
                <Dato
                  etiqueta="Lead de origen"
                  valor={
                    <Link
                      href={`/admin/leads/${venta.lead.id}`}
                      className="underline underline-offset-2"
                    >
                      {venta.lead.nombre}
                    </Link>
                  }
                />
              ) : null}
            </dl>
          </CardContent>
        </Card>

        {venta.observacion ? (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Observación</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{venta.observacion}</p>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Documentación</CardTitle>
            <CardDescription>
              Se abren con tu sesión: no hay link público a estos archivos.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {dni ? (
              <Button variant="outline" asChild>
                <a href={`/api/uploads/${dni.id}`} target="_blank" rel="noreferrer">
                  <IdCard className="size-4" />
                  Ver DNI
                </a>
              </Button>
            ) : (
              <Badge variant="outline" className="text-amber-700 dark:text-amber-500">
                sin foto del DNI todavía
              </Badge>
            )}

            {contrato ? (
              <Button variant="outline" asChild>
                <a href={`/api/uploads/${contrato.id}`} target="_blank" rel="noreferrer">
                  <FileText className="size-4" />
                  Ver contrato
                </a>
              </Button>
            ) : (
              <span className="self-center text-sm text-muted-foreground">
                Sin contrato adjunto
              </span>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Historial de cambios</CardTitle>
          </CardHeader>
          <CardContent>
            <HistorialVenta
              entradas={venta.historial.map((entrada) => ({
                id: entrada.id,
                cambios: entrada.cambios,
                autor: entrada.modificadoPor.nombre,
                fecha: entrada.createdAt,
              }))}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
