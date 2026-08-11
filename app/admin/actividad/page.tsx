import Link from "next/link";
import { Activity, ArrowRight, UserPlus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { BadgeEstado } from "@/components/leads/badge-estado";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/lib/db";
import { requireAdmin, requireZonaActivaId } from "@/lib/sesion";

const POR_PAGINA = 60;
const FECHA = new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" });

export default async function ActividadPage({ searchParams }: PageProps<"/admin/actividad">) {
  await requireAdmin();
  const zonaId = await requireZonaActivaId();

  const parametros = await searchParams;
  const pagina = Math.max(1, Number(parametros.pagina) || 1);

  const filtro = { lead: { zonaId } };

  const [total, actividades] = await Promise.all([
    db.leadActividad.count({ where: filtro }),
    db.leadActividad.findMany({
      where: filtro,
      orderBy: { createdAt: "desc" },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      include: {
        lead: { select: { id: true, nombre: true, telefono: true } },
        actor: { select: { nombre: true, role: true } },
      },
    }),
  ]);

  const paginas = Math.ceil(total / POR_PAGINA);

  return (
    <>
      <PageHeader
        titulo="Actividad"
        descripcion="Todo lo que pasa con los leads: asignaciones, cambios de estado y devoluciones."
      />

      {total === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Activity className="size-8 text-muted-foreground" />
            <div>
              <p className="font-medium">Todavía no hay movimientos</p>
              <p className="text-sm text-muted-foreground">
                Acá vas a ver cada vez que asignes un lead o un vendedor cambie su estado.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <ul className="divide-y">
              {actividades.map((actividad) => (
                <li key={actividad.id} className="flex flex-wrap items-start gap-3 p-4">
                  <span className="mt-0.5 text-muted-foreground">
                    {actividad.tipo === "ASIGNACION" ? (
                      <UserPlus className="size-4" />
                    ) : (
                      <ArrowRight className="size-4" />
                    )}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-medium">{actividad.lead.nombre}</span>
                      {actividad.lead.telefono ? (
                        <span className="tabular-nums text-muted-foreground">
                          {actividad.lead.telefono}
                        </span>
                      ) : null}
                    </p>

                    <p className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                      {actividad.tipo === "CAMBIO_ESTADO" ? (
                        <>
                          {actividad.estadoAnterior ? (
                            <BadgeEstado estado={actividad.estadoAnterior} />
                          ) : null}
                          <ArrowRight className="size-3 text-muted-foreground" />
                          {actividad.estadoNuevo ? (
                            <BadgeEstado estado={actividad.estadoNuevo} />
                          ) : null}
                        </>
                      ) : (
                        <span className="text-muted-foreground">{actividad.detalle}</span>
                      )}
                    </p>

                    {actividad.tipo === "CAMBIO_ESTADO" && actividad.detalle ? (
                      <p className="mt-1 text-sm text-muted-foreground">
                        &ldquo;{actividad.detalle}&rdquo;
                      </p>
                    ) : null}
                  </div>

                  <div className="text-right text-xs text-muted-foreground">
                    <p>{actividad.actor?.nombre ?? "Sistema"}</p>
                    <p>{FECHA.format(actividad.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          {paginas > 1 ? (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Página {pagina} de {paginas}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild disabled={pagina <= 1}>
                  <Link href={`/admin/actividad?pagina=${Math.max(1, pagina - 1)}`}>Anterior</Link>
                </Button>
                <Button variant="outline" size="sm" asChild disabled={pagina >= paginas}>
                  <Link href={`/admin/actividad?pagina=${Math.min(paginas, pagina + 1)}`}>
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
