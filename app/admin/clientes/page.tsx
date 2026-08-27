import Link from "next/link";
import { Search, Users } from "lucide-react";
import { BadgeCaidaCliente } from "@/components/clientes/badge-caida";
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
import type { Prisma } from "@/lib/generated/prisma/client";
import { estadoCaidaDelCliente, IMPAGAS_PARA_RIESGO } from "@/lib/padron/caidas";
import { requireAdmin, requireZonaActivaId } from "@/lib/sesion";

const POR_PAGINA = 50;

/**
 * Los filtros de caida. Se resuelven en SQL y no en memoria porque el padron
 * real trae miles de clientes: traerlos todos para contar cuales estan caidos
 * seria una consulta por pagina de listado.
 *
 * Son mutuamente excluyentes salvo "sin datos", que puede convivir con
 * cualquiera: un cliente con un titulo caido y otro sin historico suficiente
 * aparece en los dos.
 */
const FILTROS: Record<string, { etiqueta: string; where: Prisma.ClienteWhereInput }> = {
  total: {
    etiqueta: "Caída total",
    // `some: {}` hace falta: `every` tambien es verdadero para el cliente que
    // no tiene ningun titulo.
    where: { titulos: { some: {}, every: { caidoAt: { not: null } } } },
  },
  parcial: {
    etiqueta: "Caída parcial",
    where: {
      AND: [
        { titulos: { some: { caidoAt: { not: null } } } },
        { titulos: { some: { caidoAt: null } } },
      ],
    },
  },
  riesgo: {
    etiqueta: "En riesgo",
    where: {
      AND: [
        { titulos: { none: { caidoAt: { not: null } } } },
        { titulos: { some: { impagasConsecutivas: { gte: IMPAGAS_PARA_RIESGO } } } },
      ],
    },
  },
  sindatos: {
    etiqueta: "Sin datos suficientes",
    where: { titulos: { some: { caidaConfiable: false } } },
  },
};

export default async function ClientesPage({ searchParams }: PageProps<"/admin/clientes">) {
  await requireAdmin();
  const zonaId = await requireZonaActivaId();

  const parametros = await searchParams;
  const busqueda = typeof parametros.q === "string" ? parametros.q.trim() : "";
  const pagina = Math.max(1, Number(parametros.pagina) || 1);
  const caida =
    typeof parametros.caida === "string" && parametros.caida in FILTROS
      ? parametros.caida
      : null;

  const base: Prisma.ClienteWhereInput = {
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

  const filtro: Prisma.ClienteWhereInput = caida
    ? { AND: [base, FILTROS[caida].where] }
    : base;

  const [total, clientes, conteos] = await Promise.all([
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
        titulos: {
          select: { caidoAt: true, impagasConsecutivas: true, caidaConfiable: true },
        },
      },
    }),
    // Los contadores de los chips: cuentan sobre la busqueda, no sobre el
    // filtro activo, asi se puede saltar de uno a otro sin perder el numero.
    Promise.all(
      Object.entries(FILTROS).map(async ([clave, { etiqueta, where }]) => ({
        clave,
        etiqueta,
        cantidad: await db.cliente.count({ where: { AND: [base, where] } }),
      }))
    ),
  ]);

  const conEstado = clientes.map((cliente) => ({
    ...cliente,
    estado: estadoCaidaDelCliente(
      cliente.titulos.map((titulo) => ({
        caido: titulo.caidoAt !== null,
        impagasConsecutivas: titulo.impagasConsecutivas,
      }))
    ),
    sinDatos: cliente.titulos.some((titulo) => !titulo.caidaConfiable),
  }));

  const enlace = (extra: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const valores = { q: busqueda || undefined, caida: caida ?? undefined, ...extra };
    for (const [clave, valor] of Object.entries(valores)) {
      if (valor) params.set(clave, valor);
    }
    const query = params.toString();
    return query ? `/admin/clientes?${query}` : "/admin/clientes";
  };

  const paginas = Math.ceil(total / POR_PAGINA);

  return (
    <>
      <PageHeader
        titulo="Clientes"
        descripcion="Se arma solo con cada padrón que importás. No hace falta cargarlos a mano."
      />

      <form className="mb-3 flex max-w-md gap-2">
        {caida ? <input type="hidden" name="caida" value={caida} /> : null}
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

      <div className="mb-4 flex flex-wrap gap-2">
        <Button variant={caida ? "outline" : "secondary"} size="sm" asChild>
          <Link href={enlace({ caida: undefined, pagina: undefined })}>Todos</Link>
        </Button>
        {conteos.map(({ clave, etiqueta, cantidad }) => (
          <Button
            key={clave}
            variant={caida === clave ? "secondary" : "outline"}
            size="sm"
            asChild
          >
            <Link href={enlace({ caida: clave, pagina: undefined })}>
              {etiqueta}
              <span className="tabular-nums text-muted-foreground">{cantidad}</span>
            </Link>
          </Button>
        ))}
      </div>

      {total === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Users className="size-8 text-muted-foreground" />
            <div>
              <p className="font-medium">
                {caida
                  ? `Ningún cliente con ${FILTROS[caida].etiqueta.toLowerCase()}`
                  : busqueda
                    ? "No hay resultados para esa búsqueda"
                    : "Todavía no hay clientes"}
              </p>
              <p className="text-sm text-muted-foreground">
                {caida
                  ? "La caída se calcula con el historial de cuotas que dejan los padrones importados."
                  : busqueda
                    ? "Probá con otro nombre, DNI o número de título."
                    : "Importá un padrón y los clientes aparecen acá."}
              </p>
            </div>
            {!busqueda && !caida ? (
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
            {busqueda || caida ? " encontrados" : ""}
          </p>

          <ListaTarjetas>
            {conEstado.map((cliente) => (
              <TarjetaFila
                key={cliente.id}
                href={`/admin/clientes/${cliente.id}`}
                titulo={cliente.nombre}
                lateral={`${cliente.titulos.length} ${cliente.titulos.length === 1 ? "título" : "títulos"}`}
              >
                <DatoFila etiqueta="DNI" valor={cliente.dni} />
                <DatoFila etiqueta="Localidad" valor={cliente.localidad} />
                <DatoFila etiqueta="Teléfono" valor={cliente.telefono} />
                <DatoFila
                  etiqueta="Estado"
                  valor={
                    cliente.estado === "AL_DIA" ? null : (
                      <BadgeCaidaCliente estado={cliente.estado} />
                    )
                  }
                />
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
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-0" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {conEstado.map((cliente) => (
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
                      {cliente.titulos.length}
                    </TableCell>
                    <TableCell>
                      {cliente.estado === "AL_DIA" ? (
                        <span className="text-sm text-muted-foreground">
                          {cliente.sinDatos ? "sin datos suficientes" : "al día"}
                        </span>
                      ) : (
                        <BadgeCaidaCliente estado={cliente.estado} />
                      )}
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
                  <Link href={enlace({ pagina: String(Math.max(1, pagina - 1)) })}>
                    Anterior
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild disabled={pagina >= paginas}>
                  <Link href={enlace({ pagina: String(Math.min(paginas, pagina + 1)) })}>
                    Siguiente
                  </Link>
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </>
  );
}
