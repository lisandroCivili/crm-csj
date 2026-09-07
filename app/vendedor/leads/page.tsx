import Link from "next/link";
import { ClipboardList, Search } from "lucide-react";
import { DatoFila, ListaTarjetas, TarjetaFila } from "@/components/layout/lista-tarjetas";
import { PageHeader } from "@/components/layout/page-header";
import { Paginacion } from "@/components/layout/paginacion";
import { BadgeEstado } from "@/components/leads/badge-estado";
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
import { requirePermiso } from "@/lib/sesion";
import { ESTADOS_LEAD, ETIQUETA_ESTADO } from "@/lib/validations/lead";
import type { LeadEstado } from "@/lib/generated/prisma/client";

const POR_PAGINA = 50;

/**
 * MIS LEADS
 *
 * Traia todo sin `take`: con el padron de prueba entraba en una pantalla, con
 * una tanda real de leads asignados no. Pagina de a 50 como los cuatro listados
 * del admin, con el mismo patron de `searchParams`.
 *
 * LOS CHIPS CUENTAN SOBRE LA BUSQUEDA
 *
 * `porEstado` se agrupa con el mismo `where` que la busqueda —sin el estado—,
 * asi que al filtrar por "Juan" los numeros de los chips son los de Juan. Si
 * contaran siempre sobre todo, un chip diria 12 y la lista mostraria 2.
 */

function esEstado(valor: unknown): valor is LeadEstado {
  return typeof valor === "string" && (ESTADOS_LEAD as readonly string[]).includes(valor);
}

export default async function MisLeadsPage({ searchParams }: PageProps<"/vendedor/leads">) {
  const usuario = await requirePermiso("verLeads");
  const parametros = await searchParams;
  const estado = esEstado(parametros.estado) ? parametros.estado : undefined;
  const busqueda = typeof parametros.q === "string" ? parametros.q.trim() : "";
  const pagina = Math.max(1, Number(parametros.pagina) || 1);

  const base: Prisma.LeadWhereInput = {
    vendedorAsignadoId: usuario.vendedorId,
    ...(busqueda
      ? {
          OR: [
            { nombre: { contains: busqueda, mode: "insensitive" as const } },
            { telefono: { contains: busqueda } },
            { localidad: { contains: busqueda, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const filtro: Prisma.LeadWhereInput = estado ? { ...base, estado } : base;

  const [total, leads, porEstado] = await Promise.all([
    db.lead.count({ where: filtro }),
    db.lead.findMany({
      where: filtro,
      orderBy: [{ estado: "asc" }, { fechaAsignacion: "desc" }],
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
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
    db.lead.groupBy({ by: ["estado"], where: base, _count: true }),
  ]);

  const conteo = new Map(porEstado.map((fila) => [fila.estado, fila._count]));
  const todos = porEstado.reduce((suma, fila) => suma + fila._count, 0);

  const enlace = (extra: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const valores = { q: busqueda || undefined, estado, ...extra };
    for (const [clave, valor] of Object.entries(valores)) {
      if (valor) params.set(clave, valor);
    }
    const query = params.toString();
    return query ? `/vendedor/leads?${query}` : "/vendedor/leads";
  };

  const paginas = Math.ceil(total / POR_PAGINA);
  const sinNingunLead = todos === 0 && !busqueda && !estado;

  return (
    <>
      <PageHeader titulo="Mis leads" descripcion="Los que te asignaron para trabajar." />

      {/* Sin un solo lead asignado no se dibujan: en el celular el buscador y
          los cinco chips en cero ocupaban media pantalla justo arriba del
          cartel que explica por que no hay nada. No hay nada que buscar. */}
      {sinNingunLead ? null : (
        <>
          <form className="mb-3 flex max-w-md gap-2">
            {/* El estado viaja escondido: buscar dentro de "Pendientes" no
                tiene por que sacarte de "Pendientes". La pagina no, a
                proposito: una busqueda nueva empieza por la primera. */}
            {estado ? <input type="hidden" name="estado" value={estado} /> : null}
            <Input
              name="q"
              defaultValue={busqueda}
              placeholder="Buscar por nombre, teléfono o localidad…"
            />
            <Button type="submit" variant="outline">
              <Search className="size-4" />
              Buscar
            </Button>
          </form>

          <div className="mb-4 flex flex-wrap gap-2">
            <Button variant={estado ? "outline" : "default"} size="sm" asChild>
              <Link href={enlace({ estado: undefined, pagina: undefined })}>
                Todos ({todos})
              </Link>
            </Button>
            {ESTADOS_LEAD.map((valor) => (
              <Button
                key={valor}
                variant={estado === valor ? "default" : "outline"}
                size="sm"
                asChild
              >
                <Link
                  href={enlace({
                    estado: estado === valor ? undefined : valor,
                    pagina: undefined,
                  })}
                >
                  {ETIQUETA_ESTADO[valor]} ({conteo.get(valor) ?? 0})
                </Link>
              </Button>
            ))}
          </div>
        </>
      )}

      {total === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <ClipboardList className="size-8 text-muted-foreground" />
            <div>
              <p className="font-medium">
                {busqueda
                  ? "No hay resultados para esa búsqueda"
                  : estado
                    ? "No tenés leads en ese estado"
                    : "Todavía no te asignaron leads"}
              </p>
              <p className="text-sm text-muted-foreground">
                {busqueda
                  ? "Probá con otro nombre, teléfono o localidad."
                  : "Cuando te asignen alguno, aparece acá."}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* En el celular el vendedor llama: el telefono va como boton grande
              y el resto se acomoda debajo. */}
          <ListaTarjetas>
            {leads.map((lead) => (
              <TarjetaFila
                key={lead.id}
                href={`/vendedor/leads/${lead.id}`}
                encabezado={
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="min-w-0 truncate font-medium">{lead.nombre}</p>
                    <BadgeEstado estado={lead.estado} />
                  </div>
                }
              >
                <DatoFila
                  etiqueta="Localidad"
                  valor={[lead.localidad, lead.provincia].filter(Boolean).join(", ") || "—"}
                />
              </TarjetaFila>
            ))}
          </ListaTarjetas>

        <Card className="hidden md:block">
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
