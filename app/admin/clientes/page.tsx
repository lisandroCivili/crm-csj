import Link from "next/link";
import { Search, Users } from "lucide-react";
import { DatoFila, ListaTarjetas, TarjetaFila } from "@/components/layout/lista-tarjetas";
import { PageHeader } from "@/components/layout/page-header";
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

export default async function ClientesPage({ searchParams }: PageProps<"/admin/clientes">) {
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
            { nombre: { contains: busqueda, mode: "insensitive" as const } },
            { dni: { contains: busqueda } },
            { titulos: { some: { numTit: { contains: busqueda } } } },
          ],
        }
      : {}),
  };

  const [total, clientes] = await Promise.all([
    db.cliente.count({ where: filtro }),
    db.cliente.findMany({
      where: filtro,
      orderBy: { nombre: "asc" },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      select: {
        id: true,
        nombre: true,
        dni: true,
        localidad: true,
        telefono: true,
        _count: { select: { titulos: true } },
      },
    }),
  ]);

  const paginas = Math.ceil(total / POR_PAGINA);
  const enlacePagina = (n: number) =>
    `/admin/clientes?${new URLSearchParams({ ...(busqueda ? { q: busqueda } : {}), pagina: String(n) })}`;

  return (
    <>
      <PageHeader
        titulo="Clientes"
        descripcion="Se arma solo con cada padrón que importás. No hace falta cargarlos a mano."
      />

      <form className="mb-4 flex max-w-md gap-2">
        <Input
          name="q"
          defaultValue={busqueda}
          placeholder="Buscar por nombre, DNI o número de título…"
        />
        <Button type="submit" variant="outline">
          <Search className="size-4" />
          Buscar
        </Button>
      </form>

      {total === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Users className="size-8 text-muted-foreground" />
            <div>
              <p className="font-medium">
                {busqueda ? "No hay resultados para esa búsqueda" : "Todavía no hay clientes"}
              </p>
              <p className="text-sm text-muted-foreground">
                {busqueda
                  ? "Probá con otro nombre, DNI o número de título."
                  : "Importá un padrón y los clientes aparecen acá."}
              </p>
            </div>
            {!busqueda ? (
              <Button asChild className="mt-2">
                <Link href="/admin/padron/importar">Importar padrón</Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="mb-2 text-sm text-muted-foreground">
            {total.toLocaleString("es-AR")} cliente{total === 1 ? "" : "s"}
            {busqueda ? " encontrados" : ""}
          </p>

          <ListaTarjetas>
            {clientes.map((cliente) => (
              <TarjetaFila
                key={cliente.id}
                href={`/admin/clientes/${cliente.id}`}
                titulo={cliente.nombre}
                lateral={`${cliente._count.titulos} ${cliente._count.titulos === 1 ? "título" : "títulos"}`}
              >
                <DatoFila etiqueta="DNI" valor={cliente.dni} />
                <DatoFila etiqueta="Localidad" valor={cliente.localidad} />
                <DatoFila etiqueta="Teléfono" valor={cliente.telefono} />
              </TarjetaFila>
            ))}
          </ListaTarjetas>

          <Card className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>DNI</TableHead>
                  <TableHead>Localidad</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead className="text-right">Títulos</TableHead>
                  <TableHead className="w-0" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientes.map((cliente) => (
                  <TableRow key={cliente.id}>
                    <TableCell className="font-medium">{cliente.nombre}</TableCell>
                    <TableCell className="tabular-nums">{cliente.dni}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {cliente.localidad ?? "—"}
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {cliente.telefono ?? "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {cliente._count.titulos}
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/admin/clientes/${cliente.id}`}>Ver ficha</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
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
                  <Link href={enlacePagina(Math.max(1, pagina - 1))}>Anterior</Link>
                </Button>
                <Button variant="outline" size="sm" asChild disabled={pagina >= paginas}>
                  <Link href={enlacePagina(Math.min(paginas, pagina + 1))}>Siguiente</Link>
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </>
  );
}
