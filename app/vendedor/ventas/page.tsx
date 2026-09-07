import Link from "next/link";
import { Plus, ScrollText, Search } from "lucide-react";
import { DatoFila, ListaTarjetas, TarjetaFila } from "@/components/layout/lista-tarjetas";
import { PageHeader } from "@/components/layout/page-header";
import { Paginacion } from "@/components/layout/paginacion";
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
import { dia } from "@/lib/formato";
import type { Prisma, VentaEstado } from "@/lib/generated/prisma/client";
import { requirePermiso } from "@/lib/sesion";

const POR_PAGINA = 50;

/**
 * MIS VENTAS
 *
 * Traia todas sin `take` ni buscador, y no leia un solo `searchParam`. Ahora
 * pagina de a 50 y busca por cliente, DNI, codigo de plan, titulo o
 * suscripcion, que son las cinco formas en que el vendedor identifica una venta
 * suya cuando la va a buscar.
 *
 * EL FILTRO DE ESTADO ES DE DOS VALORES, NO DE UNO
 *
 * "Anuladas" hace falta tanto como "Activas": anular marca y no borra
 * —justamente para que la venta se pueda encontrar despues—, y sin el chip la
 * unica manera de dar con una anulada vieja es scrollear el listado entero.
 * "Todas" sigue siendo el estado inicial, con las anuladas atenuadas entre las
 * demas, que es como estaba y como se lee mejor el mes.
 */

const FILTROS: Record<string, { etiqueta: string; estado: VentaEstado }> = {
  activas: { etiqueta: "Activas", estado: "ACTIVA" },
  anuladas: { etiqueta: "Anuladas", estado: "ANULADA" },
};

export default async function MisVentasPage({ searchParams }: PageProps<"/vendedor/ventas">) {
  const usuario = await requirePermiso("cargarVentas");

  const parametros = await searchParams;
  const busqueda = typeof parametros.q === "string" ? parametros.q.trim() : "";
  const pagina = Math.max(1, Number(parametros.pagina) || 1);
  const estado =
    typeof parametros.estado === "string" && parametros.estado in FILTROS
      ? parametros.estado
      : null;

  const base: Prisma.VentaWhereInput = {
    vendedorId: usuario.vendedorId,
    ...(busqueda
      ? {
          OR: [
            { nombreCliente: { contains: busqueda, mode: "insensitive" as const } },
            { dni: { contains: busqueda } },
            { codigoProducto: { contains: busqueda, mode: "insensitive" as const } },
            { numeroTitulo: { contains: busqueda } },
            { nroSuscripcion: { contains: busqueda } },
          ],
        }
      : {}),
  };

  const filtro: Prisma.VentaWhereInput = estado
    ? { ...base, estado: FILTROS[estado].estado }
    : base;

  const [total, ventas, conteos] = await Promise.all([
    db.venta.count({ where: filtro }),
    db.venta.findMany({
      where: filtro,
      orderBy: { fechaVenta: "desc" },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      include: {
        plan: { select: { nombre: true } },
        titulo: { select: { numTit: true } },
        _count: { select: { adjuntos: true } },
      },
    }),
    // Como en los otros listados: los chips cuentan sobre la busqueda y no
    // sobre el filtro activo, asi se salta de uno a otro sin perder el numero.
    db.venta.groupBy({ by: ["estado"], where: base, _count: true }),
  ]);

  const porEstado = new Map(conteos.map((fila) => [fila.estado, fila._count]));
  const todas = conteos.reduce((suma, fila) => suma + fila._count, 0);

  const enlace = (extra: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const valores = { q: busqueda || undefined, estado: estado ?? undefined, ...extra };
    for (const [clave, valor] of Object.entries(valores)) {
      if (valor) params.set(clave, valor);
    }
    const query = params.toString();
    return query ? `/vendedor/ventas?${query}` : "/vendedor/ventas";
  };

  const paginas = Math.ceil(total / POR_PAGINA);
  const sinNingunaVenta = total === 0 && !busqueda && !estado;

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

      {/* Con el listado vacio de verdad no se dibujan ni el buscador ni los
          chips: no hay nada que filtrar y ocupan la pantalla justo donde va la
          invitacion a cargar la primera. */}
      {sinNingunaVenta ? null : (
        <>
          <form className="mb-3 flex max-w-md gap-2">
            {estado ? <input type="hidden" name="estado" value={estado} /> : null}
            <Input
              name="q"
              defaultValue={busqueda}
              placeholder="Buscar por cliente, DNI, plan o título…"
            />
            <Button type="submit" variant="outline">
              <Search className="size-4" />
              Buscar
            </Button>
          </form>

          <div className="mb-4 flex flex-wrap gap-2">
            <Button variant={estado ? "outline" : "secondary"} size="sm" asChild>
              <Link href={enlace({ estado: undefined, pagina: undefined })}>
                Todas
                <span className="tabular-nums text-muted-foreground">{todas}</span>
              </Link>
            </Button>
            {Object.entries(FILTROS).map(([clave, { etiqueta, estado: valor }]) => (
              <Button
                key={clave}
                variant={estado === clave ? "secondary" : "outline"}
                size="sm"
                asChild
              >
                <Link href={enlace({ estado: clave, pagina: undefined })}>
                  {etiqueta}
                  <span className="tabular-nums text-muted-foreground">
                    {porEstado.get(valor) ?? 0}
                  </span>
                </Link>
              </Button>
            ))}
          </div>
        </>
      )}

      {total === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <ScrollText className="size-8 text-muted-foreground" />
            <div>
              <p className="font-medium">
                {busqueda
                  ? "No hay resultados para esa búsqueda"
                  : estado
                    ? `No tenés ventas ${FILTROS[estado].etiqueta.toLowerCase()}`
                    : "Todavía no cargaste ninguna venta"}
              </p>
              <p className="text-sm text-muted-foreground">
                {busqueda
                  ? "Probá con otro nombre, DNI, plan o número de título."
                  : estado === "anuladas"
                    ? "Es una buena noticia."
                    : "Cargalas apenas las cerrás, con la foto del DNI."}
              </p>
            </div>
            {sinNingunaVenta ? (
              <Button asChild className="mt-2">
                <Link href="/vendedor/ventas/nueva">
                  <Plus className="size-4" />
                  Nueva venta
                </Link>
              </Button>
            ) : null}
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
                lateral={dia(venta.fechaVenta)}
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
                    {dia(venta.fechaVenta)}
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

          <Paginacion
            pagina={pagina}
            paginas={paginas}
            enlace={(n) => enlace({ pagina: String(n) })}
          />
        </>
      )}
    </>
  );
}
