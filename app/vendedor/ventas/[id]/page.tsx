import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, IdCard, Pencil } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { HistorialVenta } from "@/components/ventas/historial-venta";
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
import { requireVendedor } from "@/lib/sesion";

const FECHA = new Intl.DateTimeFormat("es-AR", { timeZone: "UTC" });

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

export default async function DetalleVentaPage({ params }: PageProps<"/vendedor/ventas/[id]">) {
  const usuario = await requireVendedor();
  const { id } = await params;

  const venta = await db.venta.findFirst({
    where: { id, vendedorId: usuario.vendedorId },
    include: {
      plan: { select: { nombre: true, duracionMeses: true } },
      titulo: { select: { numTit: true } },
      lead: { select: { id: true, nombre: true } },
      adjuntos: { orderBy: { createdAt: "desc" } },
      historial: {
        orderBy: { createdAt: "desc" },
        include: { modificadoPor: { select: { nombre: true } } },
      },
    },
  });

  if (!venta) notFound();

  const dni = venta.adjuntos.find((adjunto) => adjunto.tipo === "DNI");
  const contrato = venta.adjuntos.find((adjunto) => adjunto.tipo === "CONTRATO");

  return (
    <>
      <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
        <Link href="/vendedor/ventas">
          <ArrowLeft className="size-4" />
          Mis ventas
        </Link>
      </Button>

      <PageHeader
        titulo={venta.nombreCliente}
        descripcion={`DNI ${venta.dni} · ${FECHA.format(venta.fechaVenta)}`}
        acciones={
          <Button variant="outline" asChild>
            <Link href={`/vendedor/ventas/${venta.id}/editar`}>
              <Pencil className="size-4" />
              Editar
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2">
              <Dato etiqueta="Teléfono" valor={venta.telefono} />
              <Dato etiqueta="Dirección" valor={venta.direccion} />
              <Dato etiqueta="Localidad" valor={venta.localidad} />
              <Dato etiqueta="Provincia" valor={venta.provincia} />
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
                etiqueta="Débito automático"
                valor={venta.debitoAutomatico ? "Sí" : "No"}
              />
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
                      href={`/vendedor/leads/${venta.lead.id}`}
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
              <Badge variant="outline" className="text-destructive">
                falta la foto del DNI
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
