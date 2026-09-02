import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Phone, ShoppingCart } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { BadgeEstado } from "@/components/leads/badge-estado";
import { CambiarEstadoLead } from "@/components/leads/cambiar-estado";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/lib/db";
import { requirePermiso } from "@/lib/sesion";
import { ETIQUETA_ESTADO } from "@/lib/validations/lead";

const FECHA = new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" });

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

export default async function DetalleLeadPage({ params }: PageProps<"/vendedor/leads/[id]">) {
  const usuario = await requirePermiso("verLeads");
  const { id } = await params;

  const lead = await db.lead.findFirst({
    where: { id, vendedorAsignadoId: usuario.vendedorId },
    include: { actividades: { orderBy: { createdAt: "desc" }, take: 20 } },
  });

  if (!lead) notFound();

  return (
    <>
      <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
        <Link href="/vendedor/leads">
          <ArrowLeft className="size-4" />
          Mis leads
        </Link>
      </Button>

      <PageHeader
        titulo={lead.nombre}
        acciones={
          <>
            {lead.telefono ? (
              <Button variant="outline" asChild>
                <a href={`tel:${lead.telefono}`}>
                  <Phone className="size-4" />
                  Llamar
                </a>
              </Button>
            ) : null}
            <Button asChild>
              <Link href={`/vendedor/ventas/nueva?lead=${lead.id}`}>
                <ShoppingCart className="size-4" />
                Cargar venta
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Datos de contacto</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2">
              <Dato
                etiqueta="Teléfono"
                valor={
                  lead.telefono ? (
                    <a href={`tel:${lead.telefono}`} className="underline underline-offset-2">
                      {lead.telefono}
                    </a>
                  ) : null
                }
              />
              <Dato etiqueta="Localidad" valor={lead.localidad} />
              <Dato etiqueta="Provincia" valor={lead.provincia} />
              <Dato etiqueta="Dirección" valor={lead.direccion} />
              <Dato etiqueta="Estado actual" valor={<BadgeEstado estado={lead.estado} />} />
              <Dato
                etiqueta="Asignado"
                valor={lead.fechaAsignacion ? FECHA.format(lead.fechaAsignacion) : null}
              />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Actualizar estado</CardTitle>
            <CardDescription>Balta ve cada cambio que hacés.</CardDescription>
          </CardHeader>
          <CardContent>
            <CambiarEstadoLead
              leadId={lead.id}
              estadoActual={lead.estado}
              motivoActual={lead.motivoDevolucion}
            />
          </CardContent>
        </Card>

        {lead.actividades.length > 0 ? (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Historial</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y">
                {lead.actividades.map((actividad) => (
                  <li key={actividad.id} className="flex flex-wrap justify-between gap-2 py-2 text-sm">
                    <span>
                      {actividad.tipo === "LEAD_ASIGNACION"
                        ? actividad.detalle
                        : `${
                            actividad.estadoAnterior
                              ? ETIQUETA_ESTADO[actividad.estadoAnterior]
                              : "—"
                          } → ${
                            actividad.estadoNuevo ? ETIQUETA_ESTADO[actividad.estadoNuevo] : "—"
                          }`}
                      {actividad.tipo === "LEAD_CAMBIO_ESTADO" && actividad.detalle ? (
                        <span className="text-muted-foreground"> · {actividad.detalle}</span>
                      ) : null}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {FECHA.format(actividad.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </>
  );
}
