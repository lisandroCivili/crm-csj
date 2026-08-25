import Link from "next/link";
import { FileText, IdCard, Plus, ScrollText, Search } from "lucide-react";
import { DatoFila, ListaTarjetas, TarjetaFila } from "@/components/layout/lista-tarjetas";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

const POR_PAGINA = 50;
const FECHA = new Intl.DateTimeFormat("es-AR", { timeZone: "UTC" });

export default async function VentasAdminPage({ searchParams }: PageProps<"/admin/ventas">) {
  await requireAdmin();
  const zonaId = await requireZonaActivaId();

  const parametros = await searchParams;
  const busqueda = typeof parametros.q === "string" ? parametros.q.trim() : "";
  const pagina = Math.max(1, Number(parametros.pagina) || 1);

  const filtro = {
    zonaId,
    ...(busqueda
      ? {
          OR: [
            { nombreCliente: { contains: busqueda, mode: "insensitive" as const } },
            { dni: { contains: busqueda } },
            { codigoProducto: { contains: busqueda } },
          ],
        }
      : {}),
  };

  const [total, ventas] = await Promise.all([
    db.venta.count({ where: filtro }),
    db.venta.findMany({
      where: filtro,
      orderBy: { fechaVenta: "desc" },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      include: {
        vendedor: { select: { id: true, nombreCompleto: true } },
        plan: { select: { nombre: true } },
        titulo: { select: { numTit: true } },
        adjuntos: { select: { id: true, tipo: true } },
      },
    }),
  ]);

  const paginas = Math.ceil(total / POR_PAGINA);
  const enlace = (n: number) =>
    `/admin/ventas?${new URLSearchParams({ ...(busqueda ? { q: busqueda } : {}), pagina: String(n) })}`;

  return (
    <>
      <PageHeader
        titulo="Ventas"
        descripcion="Todas las ventas cargadas por el equipo en la zona activa."
        acciones={
          <Button asChild>
            <Link href="/admin/ventas/nueva">
              <Plus className="size-4" />
              Cargar venta
            </Link>
          </Button>
        }
      />

      <form className="mb-4 flex max-w-md gap-2">
        <Input name="q" defaultValue={busqueda} placeholder="Buscar por cliente, DNI o código…" />
        <Button type="submit" variant="outline">
          <Search className="size-4" />
          Buscar
        </Button>
      </form>

      {total === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <ScrollText className="size-8 text-muted-foreground" />
            <div>
              <p className="font-medium">
                {busqueda ? "No hay ventas que coincidan" : "Todavía no hay ventas cargadas"}
              </p>
              <p className="text-sm text-muted-foreground">
                Las cargan los vendedores desde su panel.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="mb-2 text-sm text-muted-foreground">
            {total.toLocaleString("es-AR")} venta{total === 1 ? "" : "s"}
          </p>

          <ListaTarjetas>
            {ventas.map((venta) => {
              const dni = venta.adjuntos.find((a) => a.tipo === "DNI");
              return (
                <TarjetaFila
                  key={venta.id}
                  titulo={venta.nombreCliente}
                  lateral={FECHA.format(venta.fechaVenta)}
                >
                  <DatoFila etiqueta="DNI" valor={venta.dni} />
                  <DatoFila etiqueta="Vendedor" valor={venta.vendedor.nombreCompleto} />
                  <DatoFila
                    etiqueta="Plan"
                    valor={venta.plan ? `${venta.codigoProducto} · ${venta.plan.nombre}` : venta.codigoProducto}
                  />
                  <DatoFila etiqueta="Título" valor={venta.titulo?.numTit ?? "sin vincular"} />
                  <DatoFila
                    etiqueta="Documentación"
                    valor={
                      dni ? (
                        <a
                          href={`/api/uploads/${dni.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="underline underline-offset-2"
                        >
                          Ver DNI
                        </a>
                      ) : (
                        "sin DNI"
                      )
                    }
                  />
                </TarjetaFila>
              );
            })}
          </ListaTarjetas>

          <Card className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>DNI</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Documentación</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ventas.map((venta) => {
                  const dni = venta.adjuntos.find((a) => a.tipo === "DNI");
                  const contrato = venta.adjuntos.find((a) => a.tipo === "CONTRATO");

                  return (
                    <TableRow key={venta.id}>
                      <TableCell className="font-medium">{venta.nombreCliente}</TableCell>
                      <TableCell className="tabular-nums">{venta.dni}</TableCell>
                      <TableCell>
                        <Link
                          href={`/admin/vendedores/${venta.vendedor.id}`}
                          className="underline underline-offset-2"
                        >
                          {venta.vendedor.nombreCompleto}
                        </Link>
                      </TableCell>
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
                        <div className="flex gap-1">
                          {dni ? (
                            <Button variant="ghost" size="sm" asChild>
                              <a href={`/api/uploads/${dni.id}`} target="_blank" rel="noreferrer">
                                <IdCard className="size-4" />
                                DNI
                              </a>
                            </Button>
                          ) : (
                            <Badge variant="outline" className="text-destructive">
                              sin DNI
                            </Badge>
                          )}
                          {contrato ? (
                            <Button variant="ghost" size="sm" asChild>
                              <a
                                href={`/api/uploads/${contrato.id}`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <FileText className="size-4" />
                                Contrato
                              </a>
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>

          {paginas > 1 ? (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Página {pagina} de {paginas}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild disabled={pagina <= 1}>
                  <Link href={enlace(Math.max(1, pagina - 1))}>Anterior</Link>
                </Button>
                <Button variant="outline" size="sm" asChild disabled={pagina >= paginas}>
                  <Link href={enlace(Math.min(paginas, pagina + 1))}>Siguiente</Link>
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </>
  );
}
