import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { cambiarEstadoVendedor } from "../actions";
import { PageHeader } from "@/components/layout/page-header";
import { CrearUsuarioForm } from "@/components/vendedores/crear-usuario-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { db } from "@/lib/db";
import { requireAdmin, requireZonaActivaId } from "@/lib/sesion";

function Dato({ etiqueta, valor }: { etiqueta: string; valor: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{etiqueta}</dt>
      <dd className="mt-0.5 text-sm">{valor || <span className="text-muted-foreground">—</span>}</dd>
    </div>
  );
}

export default async function PerfilVendedorPage({
  params,
}: PageProps<"/admin/vendedores/[id]">) {
  await requireAdmin();
  const zonaId = await requireZonaActivaId();
  const { id } = await params;

  const vendedor = await db.vendedor.findFirst({
    where: { id, zonaId },
    include: {
      user: { select: { email: true, activo: true } },
      alias: { orderBy: { nomVenPadron: "asc" } },
      _count: { select: { leads: true, ventas: true, titulos: true } },
    },
  });

  if (!vendedor) notFound();

  const [leadsPorEstado, ultimasVentas] = await Promise.all([
    db.lead.groupBy({
      by: ["estado"],
      where: { vendedorAsignadoId: vendedor.id },
      _count: true,
    }),
    db.venta.findMany({
      where: { vendedorId: vendedor.id },
      orderBy: { fechaVenta: "desc" },
      take: 5,
      select: { id: true, nombreCliente: true, fechaVenta: true, codigoProducto: true },
    }),
  ]);

  return (
    <>
      <PageHeader
        titulo={vendedor.nombreCompleto}
        descripcion={`Código ${vendedor.codigo} · DNI ${vendedor.dni}`}
        acciones={
          <>
            <Button variant="outline" asChild>
              <Link href={`/admin/vendedores/${vendedor.id}/editar`}>
                <Pencil className="size-4" />
                Editar
              </Link>
            </Button>
            <form action={cambiarEstadoVendedor}>
              <input type="hidden" name="id" value={vendedor.id} />
              <input type="hidden" name="activo" value={String(!vendedor.activo)} />
              <Button type="submit" variant={vendedor.activo ? "ghost" : "default"}>
                {vendedor.activo ? "Dar de baja" : "Reactivar"}
              </Button>
            </form>
          </>
        }
      />

      {!vendedor.activo ? (
        <p className="mb-4 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
          Este vendedor está dado de baja: no puede ingresar al sistema ni recibir leads
          nuevos. Sus datos históricos se conservan.
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Datos</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2">
              <Dato etiqueta="Nombre completo" valor={vendedor.nombreCompleto} />
              <Dato etiqueta="DNI" valor={vendedor.dni} />
              <Dato etiqueta="Código" valor={vendedor.codigo} />
              <Dato etiqueta="Teléfono" valor={vendedor.telefono} />
              <Dato etiqueta="Email" valor={vendedor.email} />
              <Dato etiqueta="Dirección" valor={vendedor.direccion} />
            </dl>

            <Separator className="my-5" />

            <dl className="grid gap-4 sm:grid-cols-2">
              <Dato
                etiqueta="Cobra comisión hasta"
                valor={`c${vendedor.topeCuotasComision}`}
              />
              <Dato etiqueta="Condiciones" valor={vendedor.condiciones} />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Actividad</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Leads asignados</span>
              <span className="tabular-nums">{vendedor._count.leads}</span>
            </div>
            {leadsPorEstado.map((fila) => (
              <div key={fila.estado} className="flex justify-between pl-4 text-sm">
                <span className="text-muted-foreground">{fila.estado.toLowerCase()}</span>
                <span className="tabular-nums">{fila._count}</span>
              </div>
            ))}
            <Separator />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Ventas cargadas</span>
              <span className="tabular-nums">{vendedor._count.ventas}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Títulos en el padrón</span>
              <span className="tabular-nums">{vendedor._count.titulos}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Cuenta de ingreso</CardTitle>
            <CardDescription>
              Es opcional: un vendedor puede figurar en el padrón sin usar el sistema.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {vendedor.user ? (
              <div className="flex items-center gap-3 text-sm">
                <Badge variant="secondary">{vendedor.user.email}</Badge>
                <span className="text-muted-foreground">
                  {vendedor.user.activo ? "activa" : "desactivada"}
                </span>
              </div>
            ) : (
              <CrearUsuarioForm
                vendedorId={vendedor.id}
                emailSugerido={vendedor.email}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nombres en el padrón</CardTitle>
            <CardDescription>
              Variantes con las que aparece en la columna NomVen.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {vendedor.alias.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Todavía no se vinculó ningún nombre. Se cargan al importar un padrón.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {vendedor.alias.map((alias) => (
                  <li key={alias.id} className="font-mono text-xs">
                    {alias.nomVenPadron}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {ultimasVentas.length > 0 ? (
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="text-base">Últimas ventas</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y">
                {ultimasVentas.map((venta) => (
                  <li key={venta.id} className="flex justify-between py-2 text-sm">
                    <span>{venta.nombreCliente}</span>
                    <span className="text-muted-foreground">
                      {venta.codigoProducto ? `${venta.codigoProducto} · ` : ""}
                      {venta.fechaVenta.toLocaleDateString("es-AR")}
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
