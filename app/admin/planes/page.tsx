import Link from "next/link";
import { Package, Upload } from "lucide-react";
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
import { requireAdmin } from "@/lib/sesion";

const PESOS = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});
const MES = new Intl.DateTimeFormat("es-AR", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export default async function PlanesPage() {
  await requireAdmin();

  const planes = await db.plan.findMany({
    orderBy: { codigoProducto: "asc" },
    include: {
      precios: { orderBy: { vigenteDesde: "desc" }, take: 2 },
      _count: { select: { ventas: true } },
    },
  });

  return (
    <>
      <PageHeader
        titulo="Planes"
        descripcion="Catálogo de productos y su lista de precios. Los planes no dependen de la zona."
        acciones={
          <Button asChild>
            <Link href="/admin/planes/importar">
              <Upload className="size-4" />
              Cargar precios
            </Link>
          </Button>
        }
      />

      {planes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Package className="size-8 text-muted-foreground" />
            <div>
              <p className="font-medium">Todavía no hay planes cargados</p>
              <p className="text-sm text-muted-foreground">
                Los vendedores los necesitan para poder cargar una venta.
              </p>
            </div>
            <Button asChild className="mt-2">
              <Link href="/admin/planes/importar">
                <Upload className="size-4" />
                Cargar lista de precios
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Código</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Duración</TableHead>
                <TableHead className="text-right">Precio vigente</TableHead>
                <TableHead>Desde</TableHead>
                <TableHead className="text-right">Precio anterior</TableHead>
                <TableHead className="text-right">Ventas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {planes.map((plan) => {
                const [vigente, anterior] = plan.precios;
                return (
                  <TableRow key={plan.id} className={plan.activo ? "" : "opacity-55"}>
                    <TableCell className="font-mono tabular-nums">
                      {plan.codigoProducto}
                    </TableCell>
                    <TableCell className="font-medium">
                      {plan.nombre}
                      {!plan.activo ? (
                        <Badge variant="outline" className="ml-2">
                          inactivo
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {plan.duracionMeses ? `${plan.duracionMeses} meses` : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {vigente ? PESOS.format(Number(vigente.precio)) : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {vigente ? MES.format(vigente.vigenteDesde) : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {anterior ? PESOS.format(Number(anterior.precio)) : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {plan._count.ventas}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </>
  );
}
