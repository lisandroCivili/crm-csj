import Link from "next/link";
import { Search, Users } from "lucide-react";
import { BadgeCaidaTitulo } from "@/components/clientes/badge-caida";
import { DatoFila, ListaTarjetas, TarjetaFila } from "@/components/layout/lista-tarjetas";
import { PageHeader } from "@/components/layout/page-header";
import { Paginacion } from "@/components/layout/paginacion";
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
import { IMPAGAS_PARA_RIESGO } from "@/lib/padron/caidas";
import { requirePermiso } from "@/lib/sesion";

const POR_PAGINA = 50;

/**
 * MI CARTERA
 *
 * Los titulos del padron que le pertenecen a este vendedor. Balta pidio que
 * "solo admin ve clientes" (docs/info.txt), asi que esto NO es el listado de
 * clientes recortado: es su produccion y nada mas. Lo aprobo Lisandro el
 * 07/09/2026, y ademas se puede apagar por vendedor con `puedeVerCartera`.
 *
 * LA UNIDAD ES EL TITULO, NO EL CLIENTE
 *
 * El listado del admin agrupa por cliente y calcula la caida mirando todos sus
 * titulos. Copiar eso aca mostraria datos ajenos: un cliente puede tener un
 * titulo de este vendedor y otro de otro, y la "caida total" del cliente
 * incluiria el que no le corresponde. Por eso se listan titulos, filtrados por
 * `vendedorId` Y `zonaId` —los dos, aunque la ficha del vendedor ya sea por
 * zona—, y el estado que se muestra es el del titulo.
 */

const FILTROS: Record<string, { etiqueta: string; where: Prisma.TituloWhereInput }> = {
  caidos: {
    etiqueta: "Caídos",
    where: { caidoAt: { not: null } },
  },
  riesgo: {
    etiqueta: "En riesgo",
    // `caidaConfiable` de por medio a proposito: un titulo con tres impagas
    // conocidas pero historial incompleto se muestra como "sin datos
    // suficientes", asi que contarlo aca dejaria al chip diciendo una cosa y al
    // badge de la fila diciendo otra. Con esto los tres chips son disjuntos: un
    // caido siempre es confiable (la racha ya paso el umbral), asi que tampoco
    // se solapa con el primero.
    where: {
      caidoAt: null,
      caidaConfiable: true,
      impagasConsecutivas: { gte: IMPAGAS_PARA_RIESGO },
    },
  },
  sindatos: {
    etiqueta: "Sin datos suficientes",
    where: { caidaConfiable: false },
  },
};

export default async function CarteraPage({ searchParams }: PageProps<"/vendedor/cartera">) {
  const usuario = await requirePermiso("verCartera");

  const parametros = await searchParams;
  const busqueda = typeof parametros.q === "string" ? parametros.q.trim() : "";
  const pagina = Math.max(1, Number(parametros.pagina) || 1);
  const caida =
    typeof parametros.caida === "string" && parametros.caida in FILTROS
      ? parametros.caida
      : null;

  const base: Prisma.TituloWhereInput = {
    vendedorId: usuario.vendedorId,
    ...(usuario.zonaIdFija === null ? {} : { zonaId: usuario.zonaIdFija }),
    ...(busqueda
      ? {
          OR: [
            { numTit: { contains: busqueda } },
            { cliente: { nombre: { contains: busqueda, mode: "insensitive" as const } } },
            { cliente: { dni: { contains: busqueda } } },
          ],
        }
      : {}),
  };

  const filtro: Prisma.TituloWhereInput = caida ? { AND: [base, FILTROS[caida].where] } : base;

  const [total, titulos, conteos] = await Promise.all([
    db.titulo.count({ where: filtro }),
    db.titulo.findMany({
      where: filtro,
      // Primero los que hay que llamar. Ordenar por nombre serviria para
      // buscar, y para eso esta el buscador: esta pantalla es una lista de
      // trabajo, no un directorio.
      orderBy: [{ impagasConsecutivas: "desc" }, { numTit: "asc" }],
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      select: {
        id: true,
        numTit: true,
        impagasConsecutivas: true,
        caidoAt: true,
        caidaConfiable: true,
        cuotaUltimaPaga: true,
        cliente: { select: { nombre: true, telefono: true, localidad: true } },
      },
    }),
    // Los contadores cuentan sobre la busqueda y no sobre el filtro activo, asi
    // se salta de un chip a otro sin perder el numero.
    Promise.all(
      Object.entries(FILTROS).map(async ([clave, { etiqueta, where }]) => ({
        clave,
        etiqueta,
        cantidad: await db.titulo.count({ where: { AND: [base, where] } }),
      }))
    ),
  ]);

  const enlace = (extra: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const valores = { q: busqueda || undefined, caida: caida ?? undefined, ...extra };
    for (const [clave, valor] of Object.entries(valores)) {
      if (valor) params.set(clave, valor);
    }
    const query = params.toString();
    return query ? `/vendedor/cartera?${query}` : "/vendedor/cartera";
  };

  const paginas = Math.ceil(total / POR_PAGINA);

  return (
    <>
      <PageHeader
        titulo="Mi cartera"
        descripcion="Tus títulos del padrón. Arriba, los que conviene llamar."
      />

      <form className="mb-3 flex max-w-md gap-2">
        {caida ? <input type="hidden" name="caida" value={caida} /> : null}
        <Input
          name="q"
          defaultValue={busqueda}
          placeholder="Buscar por cliente, DNI o número de título…"
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
                  ? `Ningún título en ${FILTROS[caida].etiqueta.toLowerCase()}`
                  : busqueda
                    ? "No hay resultados para esa búsqueda"
                    : "Todavía no tenés títulos en el padrón"}
              </p>
              <p className="text-sm text-muted-foreground">
                {caida
                  ? "Es una buena noticia: son los que habría que llamar."
                  : busqueda
                    ? "Probá con otro nombre, DNI o número de título."
                    : "Tus ventas aparecen acá cuando el club las manda en el padrón, unos días después del sorteo."}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="mb-2 text-sm text-muted-foreground">
            {total.toLocaleString("es-AR")} título{total === 1 ? "" : "s"}
            {busqueda || caida ? " encontrados" : ""}
          </p>

          <ListaTarjetas>
            {titulos.map((titulo) => (
              <TarjetaFila
                key={titulo.id}
                href={`/vendedor/cartera/${titulo.id}`}
                titulo={titulo.cliente.nombre}
                lateral={titulo.numTit}
              >
                <DatoFila etiqueta="Teléfono" valor={titulo.cliente.telefono} />
                <DatoFila etiqueta="Localidad" valor={titulo.cliente.localidad} />
                <DatoFila
                  etiqueta="Última paga"
                  valor={titulo.cuotaUltimaPaga ? `cuota ${titulo.cuotaUltimaPaga}` : null}
                />
                <DatoFila etiqueta="Estado" valor={<BadgeCaidaTitulo titulo={titulo} />} />
              </TarjetaFila>
            ))}
          </ListaTarjetas>

          <Card className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead className="text-right">Última paga</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-0" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {titulos.map((titulo) => (
                  <TableRow key={titulo.id}>
                    <TableCell className="font-medium">{titulo.cliente.nombre}</TableCell>
                    <TableCell className="font-mono text-xs">{titulo.numTit}</TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {titulo.cliente.telefono ? (
                        // El uso real de esta pantalla es llamar.
                        <a href={`tel:${titulo.cliente.telefono}`} className="hover:underline">
                          {titulo.cliente.telefono}
                        </a>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {titulo.cuotaUltimaPaga ? `c${titulo.cuotaUltimaPaga}` : "—"}
                    </TableCell>
                    <TableCell>
                      {titulo.caidoAt ||
                      !titulo.caidaConfiable ||
                      titulo.impagasConsecutivas > 0 ? (
                        <BadgeCaidaTitulo titulo={titulo} />
                      ) : (
                        <span className="text-sm text-muted-foreground">al día</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/vendedor/cartera/${titulo.id}`}>Ver</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          <Paginacion pagina={pagina} paginas={paginas} enlace={(n) => enlace({ pagina: String(n) })} />
        </>
      )}
    </>
  );
}
