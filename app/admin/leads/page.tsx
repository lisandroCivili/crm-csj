import Link from "next/link";
import { ClipboardList, Search, Upload } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { TablaLeads } from "@/components/leads/tabla-leads";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { db } from "@/lib/db";
import { requireAdmin, requireZonaActivaId } from "@/lib/sesion";
import { ESTADOS_LEAD, ETIQUETA_ESTADO, ETIQUETA_ORIGEN } from "@/lib/validations/lead";
import type { LeadEstado, LeadOrigen } from "@/lib/generated/prisma/client";

const POR_PAGINA = 50;

function esEstado(valor: unknown): valor is LeadEstado {
  return typeof valor === "string" && (ESTADOS_LEAD as readonly string[]).includes(valor);
}

export default async function LeadsPage({ searchParams }: PageProps<"/admin/leads">) {
  await requireAdmin();
  const zonaId = await requireZonaActivaId();

  const parametros = await searchParams;
  const busqueda = typeof parametros.q === "string" ? parametros.q.trim() : "";
  const estado = esEstado(parametros.estado) ? parametros.estado : undefined;
  const origen =
    parametros.origen === "CLUB" || parametros.origen === "PROPIO"
      ? (parametros.origen as LeadOrigen)
      : undefined;
  const asignacion = parametros.asignacion === "sin" ? "sin" : undefined;
  const pagina = Math.max(1, Number(parametros.pagina) || 1);

  const filtro = {
    zonaId,
    ...(estado ? { estado } : {}),
    ...(origen ? { origen } : {}),
    ...(asignacion === "sin" ? { vendedorAsignadoId: null } : {}),
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

  const [total, leads, vendedores, porEstado, sinAsignar] = await Promise.all([
    db.lead.count({ where: filtro }),
    db.lead.findMany({
      where: filtro,
      orderBy: { createdAt: "desc" },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      select: {
        id: true,
        nombre: true,
        telefono: true,
        localidad: true,
        provincia: true,
        origen: true,
        estado: true,
        motivoDevolucion: true,
        vendedorAsignado: { select: { id: true, nombreCompleto: true } },
      },
    }),
    db.vendedor.findMany({
      where: { zonaId, activo: true },
      orderBy: { nombreCompleto: "asc" },
      select: { id: true, nombreCompleto: true },
    }),
    db.lead.groupBy({ by: ["estado"], where: { zonaId }, _count: true }),
    db.lead.count({ where: { zonaId, vendedorAsignadoId: null } }),
  ]);

  const paginas = Math.ceil(total / POR_PAGINA);
  const conteo = new Map(porEstado.map((fila) => [fila.estado, fila._count]));

  const enlace = (cambios: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const base = { q: busqueda, estado, origen, asignacion, ...cambios };
    for (const [clave, valor] of Object.entries(base)) {
      if (valor) params.set(clave, valor);
    }
    const query = params.toString();
    return `/admin/leads${query ? `?${query}` : ""}`;
  };

  const filtros = [
    { etiqueta: "Todos", activo: !estado && !origen && !asignacion, href: "/admin/leads" },
    {
      etiqueta: `Sin asignar (${sinAsignar})`,
      activo: asignacion === "sin",
      href: enlace({ asignacion: asignacion === "sin" ? undefined : "sin", estado: undefined }),
    },
    ...ESTADOS_LEAD.map((valor) => ({
      etiqueta: `${ETIQUETA_ESTADO[valor]} (${conteo.get(valor) ?? 0})`,
      activo: estado === valor,
      href: enlace({ estado: estado === valor ? undefined : valor, asignacion: undefined }),
    })),
    ...(["CLUB", "PROPIO"] as const).map((valor) => ({
      etiqueta: ETIQUETA_ORIGEN[valor],
      activo: origen === valor,
      href: enlace({ origen: origen === valor ? undefined : valor }),
    })),
  ];

  return (
    <>
      <PageHeader
        titulo="Leads"
        descripcion="Seleccioná varios con las casillas para asignarlos de una vez."
        acciones={
          <Button asChild>
            <Link href="/admin/leads/importar">
              <Upload className="size-4" />
              Importar leads
            </Link>
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {filtros.map((filtro) => (
          <Button
            key={filtro.etiqueta}
            variant={filtro.activo ? "default" : "outline"}
            size="sm"
            asChild
          >
            <Link href={filtro.href}>{filtro.etiqueta}</Link>
          </Button>
        ))}
      </div>

      <form className="mb-4 flex max-w-md gap-2">
        {estado ? <input type="hidden" name="estado" value={estado} /> : null}
        {origen ? <input type="hidden" name="origen" value={origen} /> : null}
        <Input name="q" defaultValue={busqueda} placeholder="Buscar por nombre, teléfono o localidad…" />
        <Button type="submit" variant="outline">
          <Search className="size-4" />
          Buscar
        </Button>
      </form>

      {total === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <ClipboardList className="size-8 text-muted-foreground" />
            <div>
              <p className="font-medium">No hay leads que coincidan</p>
              <p className="text-sm text-muted-foreground">
                Importá el export de Meta Ads y asignalos al equipo.
              </p>
            </div>
            <Button asChild className="mt-2">
              <Link href="/admin/leads/importar">
                <Upload className="size-4" />
                Importar leads
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="mb-2 text-sm text-muted-foreground">
            {total.toLocaleString("es-AR")} lead{total === 1 ? "" : "s"}
          </p>

          <TablaLeads leads={leads} vendedores={vendedores} />

          {paginas > 1 ? (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Página {pagina} de {paginas}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild disabled={pagina <= 1}>
                  <Link href={enlace({ pagina: String(Math.max(1, pagina - 1)) })}>Anterior</Link>
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
