import Link from "next/link";
import { FileSpreadsheet, Upload } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
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

const MES = new Intl.DateTimeFormat("es-AR", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function rangoDePeriodos(desde: Date | null, hasta: Date | null): string {
  if (!desde || !hasta) return "—";
  const a = MES.format(desde);
  const b = MES.format(hasta);
  return a === b ? a : `${a} — ${b}`;
}

export default async function PadronPage() {
  await requireAdmin();
  const zonaId = await requireZonaActivaId();

  const importaciones = await db.padronImport.findMany({
    where: { zonaId },
    orderBy: { createdAt: "desc" },
    include: { importadoPor: { select: { nombre: true } } },
  });

  return (
    <>
      <PageHeader
        titulo="Padrón"
        descripcion="Histórico de los archivos que envió el club. Se conservan todos para poder auditar de dónde salió cada dato."
        acciones={
          <Button asChild>
            <Link href="/admin/padron/importar">
              <Upload className="size-4" />
              Importar padrón
            </Link>
          </Button>
        }
      />

      {importaciones.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <FileSpreadsheet className="size-8 text-muted-foreground" />
            <div>
              <p className="font-medium">Todavía no importaste ningún padrón</p>
              <p className="text-sm text-muted-foreground">
                De acá sale el padrón de clientes, sus títulos y las cuotas cobradas.
              </p>
            </div>
            <Button asChild className="mt-2">
              <Link href="/admin/padron/importar">
                <Upload className="size-4" />
                Importar el primero
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Archivo</TableHead>
                <TableHead>Períodos</TableHead>
                <TableHead className="text-right">Filas</TableHead>
                <TableHead className="text-right">Clientes</TableHead>
                <TableHead className="text-right">Títulos</TableHead>
                <TableHead className="text-right">Cuotas</TableHead>
                <TableHead className="text-right">Cobradas</TableHead>
                <TableHead>Importó</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {importaciones.map((importacion) => (
                <TableRow key={importacion.id}>
                  <TableCell>
                    <p className="font-medium">{importacion.archivoNombre}</p>
                    <p className="text-xs text-muted-foreground">
                      {importacion.createdAt.toLocaleString("es-AR")}
                    </p>
                  </TableCell>
                  <TableCell className="text-sm">
                    {rangoDePeriodos(importacion.periodoDesde, importacion.periodoHasta)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {importacion.filasLeidas.toLocaleString("es-AR")}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    +{importacion.clientesNuevos}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    +{importacion.titulosNuevos}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    +{importacion.cuotasNuevas}
                    {importacion.cuotasActualizadas > 0 ? (
                      <span className="text-muted-foreground">
                        {" "}
                        / {importacion.cuotasActualizadas} act.
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {importacion.cuotasReciePagadas.toLocaleString("es-AR")}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {importacion.importadoPor.nombre}
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
