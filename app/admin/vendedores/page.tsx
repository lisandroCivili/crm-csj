import Link from "next/link";
import { Plus, UserSquare } from "lucide-react";
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
import { requireAdmin, requireZonaActivaId } from "@/lib/sesion";

export default async function VendedoresPage() {
  await requireAdmin();
  const zonaId = await requireZonaActivaId();

  const vendedores = await db.vendedor.findMany({
    where: { zonaId },
    orderBy: [{ activo: "desc" }, { nombreCompleto: "asc" }],
    select: {
      id: true,
      nombreCompleto: true,
      codigo: true,
      dni: true,
      activo: true,
      topeCuotasComision: true,
      userId: true,
      _count: { select: { leads: true, ventas: true, titulos: true } },
    },
  });

  return (
    <>
      <PageHeader
        titulo="Vendedores"
        descripcion="Equipo de venta de la zona activa."
        acciones={
          <Button asChild>
            <Link href="/admin/vendedores/nuevo">
              <Plus className="size-4" />
              Nuevo vendedor
            </Link>
          </Button>
        }
      />

      {vendedores.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <UserSquare className="size-8 text-muted-foreground" />
            <div>
              <p className="font-medium">Todavía no hay vendedores en esta zona</p>
              <p className="text-sm text-muted-foreground">
                Cargá el primero para poder asignarle leads.
              </p>
            </div>
            <Button asChild className="mt-2">
              <Link href="/admin/vendedores/nuevo">
                <Plus className="size-4" />
                Nuevo vendedor
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>DNI</TableHead>
                <TableHead className="text-right">Leads</TableHead>
                <TableHead className="text-right">Ventas</TableHead>
                <TableHead className="text-right">Títulos</TableHead>
                <TableHead>Comisión</TableHead>
                <TableHead>Cuenta</TableHead>
                <TableHead className="w-0" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendedores.map((vendedor) => (
                <TableRow key={vendedor.id} className={vendedor.activo ? "" : "opacity-55"}>
                  <TableCell className="font-medium">
                    {vendedor.nombreCompleto}
                    {!vendedor.activo ? (
                      <Badge variant="outline" className="ml-2">
                        inactivo
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell className="tabular-nums">{vendedor.codigo}</TableCell>
                  <TableCell className="tabular-nums">{vendedor.dni}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {vendedor._count.leads}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {vendedor._count.ventas}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {vendedor._count.titulos}
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground">hasta</span> c
                    {vendedor.topeCuotasComision}
                  </TableCell>
                  <TableCell>
                    {vendedor.userId ? (
                      <Badge variant="secondary">sí</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">sin cuenta</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/admin/vendedores/${vendedor.id}`}>Ver perfil</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </>
  );
}
