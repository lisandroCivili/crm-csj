import Link from "next/link";
import { Plus, ScrollText } from "lucide-react";
import { DatoFila, ListaTarjetas, TarjetaFila } from "@/components/layout/lista-tarjetas";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { db } from "@/lib/db";
import { requirePermiso } from "@/lib/sesion";

const FECHA = new Intl.DateTimeFormat("es-AR", { timeZone: "UTC" });

export default async function MisVentasPage() {
  const usuario = await requirePermiso("cargarVentas");

  const ventas = await db.venta.findMany({
    where: { vendedorId: usuario.vendedorId },
    orderBy: { fechaVenta: "desc" },
    include: {
      plan: { select: { nombre: true } },
      titulo: { select: { numTit: true } },
      _count: { select: { adjuntos: true } },
    },
  });

  return (
    <>
      <PageHeader
        titulo="Mis ventas"
        descripcion="Las que cargaste vos."
        acciones={
          <Button asChild>
            <Link href="/vendedor/ventas/nueva">
              <Plus className="size-4" />
              Nueva venta
            </Link>
          </Button>
        }
      />

      {ventas.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <ScrollText className="size-8 text-muted-foreground" />
            <div>
              <p className="font-medium">Todavía no cargaste ninguna venta</p>
              <p className="text-sm text-muted-foreground">
                Cargalas apenas las cerrás, con la foto del DNI.
              </p>
            </div>
            <Button asChild className="mt-2">
              <Link href="/vendedor/ventas/nueva">
                <Plus className="size-4" />
                Nueva venta
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <ListaTarjetas>
            {ventas.map((venta) => (
              <TarjetaFila
                key={venta.id}
                href={`/vendedor/ventas/${venta.id}`}
                atenuada={venta.estado === "ANULADA"}
                encabezado={
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="min-w-0 truncate font-medium">{venta.nombreCliente}</p>
                    {venta.estado === "ANULADA" ? (
                      <Badge variant="outline">anulada</Badge>
                    ) : null}
                  </div>
                }
                lateral={FECHA.format(venta.fechaVenta)}
              >
                <DatoFila etiqueta="DNI" valor={venta.dni} />
                <DatoFila
                  etiqueta="Plan"
                  valor={
                    venta.plan ? `${venta.codigoProducto} · ${venta.plan.nombre}` : venta.codigoProducto
                  }
                />
                <DatoFila
                  etiqueta="Título"
                  valor={venta.titulo?.numTit ?? "sin vincular"}
                />
              </TarjetaFila>
            ))}
          </ListaTarjetas>

        <Card className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>DNI</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Título</TableHead>
                <TableHead className="w-0" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {ventas.map((venta) => (
                <TableRow key={venta.id} className={venta.estado === "ANULADA" ? "opacity-55" : ""}>
                  <TableCell className="font-medium">
                    {venta.nombreCliente}
                    {venta.estado === "ANULADA" ? (
                      <Badge variant="outline" className="ml-2">
                        anulada
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell className="tabular-nums">{venta.dni}</TableCell>
                  <TableCell>
                    <span className="font-mono text-xs">{venta.codigoProducto}</span>
                    {venta.plan ? (
                      <span className="text-muted-foreground"> · {venta.plan.nombre}</span>
                    ) : null}
                  </TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {FECHA.format(venta.fechaVenta)}
                  </TableCell>
                  <TableCell>
                    {venta.titulo ? (
                      <span className="tabular-nums">{venta.titulo.numTit}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">sin vincular</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/vendedor/ventas/${venta.id}`}>Ver</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
        </>
      )}
    </>
  );
}
