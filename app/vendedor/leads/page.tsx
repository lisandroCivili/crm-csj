import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { BadgeEstado } from "@/components/leads/badge-estado";
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
import { requireVendedor } from "@/lib/sesion";
import { ESTADOS_LEAD, ETIQUETA_ESTADO } from "@/lib/validations/lead";
import type { LeadEstado } from "@/lib/generated/prisma/client";

function esEstado(valor: unknown): valor is LeadEstado {
  return typeof valor === "string" && (ESTADOS_LEAD as readonly string[]).includes(valor);
}

export default async function MisLeadsPage({ searchParams }: PageProps<"/vendedor/leads">) {
  const usuario = await requireVendedor();
  const parametros = await searchParams;
  const estado = esEstado(parametros.estado) ? parametros.estado : undefined;

  const filtro = {
    vendedorAsignadoId: usuario.vendedorId,
    ...(estado ? { estado } : {}),
  };

  const [leads, porEstado] = await Promise.all([
    db.lead.findMany({
      where: filtro,
      orderBy: [{ estado: "asc" }, { fechaAsignacion: "desc" }],
      select: {
        id: true,
        nombre: true,
        telefono: true,
        localidad: true,
        provincia: true,
        estado: true,
        fechaAsignacion: true,
      },
    }),
    db.lead.groupBy({
      by: ["estado"],
      where: { vendedorAsignadoId: usuario.vendedorId },
      _count: true,
    }),
  ]);

  const conteo = new Map(porEstado.map((fila) => [fila.estado, fila._count]));
  const total = porEstado.reduce((suma, fila) => suma + fila._count, 0);

  return (
    <>
      <PageHeader titulo="Mis leads" descripcion="Los que te asignaron para trabajar." />

      <div className="mb-4 flex flex-wrap gap-2">
        <Button variant={estado ? "outline" : "default"} size="sm" asChild>
          <Link href="/vendedor/leads">Todos ({total})</Link>
        </Button>
        {ESTADOS_LEAD.map((valor) => (
          <Button
            key={valor}
            variant={estado === valor ? "default" : "outline"}
            size="sm"
            asChild
          >
            <Link href={estado === valor ? "/vendedor/leads" : `/vendedor/leads?estado=${valor}`}>
              {ETIQUETA_ESTADO[valor]} ({conteo.get(valor) ?? 0})
            </Link>
          </Button>
        ))}
      </div>

      {leads.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <ClipboardList className="size-8 text-muted-foreground" />
            <div>
              <p className="font-medium">
                {estado ? "No tenés leads en ese estado" : "Todavía no te asignaron leads"}
              </p>
              <p className="text-sm text-muted-foreground">
                Cuando te asignen alguno, aparece acá.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Localidad</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-0" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell className="font-medium">{lead.nombre}</TableCell>
                  <TableCell className="tabular-nums">
                    {lead.telefono ? (
                      <a href={`tel:${lead.telefono}`} className="underline underline-offset-2">
                        {lead.telefono}
                      </a>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {[lead.localidad, lead.provincia].filter(Boolean).join(", ") || "—"}
                  </TableCell>
                  <TableCell>
                    <BadgeEstado estado={lead.estado} />
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/vendedor/leads/${lead.id}`}>Abrir</Link>
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
