import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Ban,
  FilePen,
  RotateCcw,
  ScrollText,
  UserPen,
  UserPlus,
} from "lucide-react";
import { ListaCambios } from "@/components/actividad/lista-cambios";
import { DatoFila, ListaTarjetas, TarjetaFila } from "@/components/layout/lista-tarjetas";
import { PageHeader } from "@/components/layout/page-header";
import { BadgeEstado } from "@/components/leads/badge-estado";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/lib/db";
import type { ActividadTipo, Prisma } from "@/lib/generated/prisma/client";
import { requireAdmin, requireZonaActivaId } from "@/lib/sesion";

const POR_PAGINA = 60;
const FECHA = new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" });

/**
 * Los chips agrupan por familia y no un chip por tipo. Con siete tipos —dos de
 * lead, cuatro de venta y uno de cliente— la fila de chips ocupaba tres
 * renglones en el celular, y nadie quiere filtrar "solo reactivaciones": lo que
 * se busca es "que paso con las ventas". El tipo exacto igual se lee en cada
 * renglon.
 */
const FAMILIAS: Record<string, { etiqueta: string; tipos: ActividadTipo[] }> = {
  leads: {
    etiqueta: "Leads",
    tipos: ["LEAD_ASIGNACION", "LEAD_CAMBIO_ESTADO"],
  },
  ventas: {
    etiqueta: "Ventas",
    tipos: ["VENTA_ALTA", "VENTA_EDICION", "VENTA_ANULACION", "VENTA_REACTIVACION"],
  },
  clientes: {
    etiqueta: "Clientes",
    tipos: ["CLIENTE_EDICION"],
  },
};

const PRESENTACION: Record<ActividadTipo, { icono: LucideIcon; verbo: string }> = {
  LEAD_ASIGNACION: { icono: UserPlus, verbo: "Lead asignado" },
  LEAD_CAMBIO_ESTADO: { icono: ArrowRight, verbo: "Estado del lead" },
  VENTA_ALTA: { icono: ScrollText, verbo: "Venta cargada" },
  VENTA_EDICION: { icono: FilePen, verbo: "Venta editada" },
  VENTA_ANULACION: { icono: Ban, verbo: "Venta anulada" },
  VENTA_REACTIVACION: { icono: RotateCcw, verbo: "Venta reactivada" },
  CLIENTE_EDICION: { icono: UserPen, verbo: "Datos del cliente" },
};

export default async function ActividadPage({ searchParams }: PageProps<"/admin/actividad">) {
  await requireAdmin();
  const zonaId = await requireZonaActivaId();

  const parametros = await searchParams;
  const pagina = Math.max(1, Number(parametros.pagina) || 1);
  const familia =
    typeof parametros.tipo === "string" && parametros.tipo in FAMILIAS ? parametros.tipo : null;

  // Los vendedores se traen antes del listado porque el id que llega por query
  // se valida contra ellos: uno de la otra zona no filtra nada, mostraria el
  // feed entero y haria creer que ese vendedor movio todo.
  const vendedores = await db.vendedor.findMany({
    where: { zonaId },
    orderBy: { nombreCompleto: "asc" },
    select: { id: true, nombreCompleto: true },
  });

  const vendedorId =
    typeof parametros.vendedor === "string" &&
    vendedores.some((vendedor) => vendedor.id === parametros.vendedor)
      ? parametros.vendedor
      : null;

  const base: Prisma.ActividadWhereInput = {
    zonaId,
    ...(vendedorId ? { vendedorId } : {}),
  };

  const filtro: Prisma.ActividadWhereInput = familia
    ? { ...base, tipo: { in: FAMILIAS[familia].tipos } }
    : base;

  const [total, actividades, conteos] = await Promise.all([
    db.actividad.count({ where: filtro }),
    db.actividad.findMany({
      where: filtro,
      orderBy: { createdAt: "desc" },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      include: {
        actor: { select: { nombre: true } },
        vendedor: { select: { nombreCompleto: true } },
        lead: { select: { nombre: true, telefono: true } },
        venta: { select: { id: true, nombreCliente: true } },
        cliente: { select: { id: true, nombre: true } },
      },
    }),
    // Los contadores cuentan sobre el vendedor elegido y no sobre la familia
    // activa, para poder saltar de una a otra sin perder el numero.
    Promise.all(
      Object.entries(FAMILIAS).map(async ([clave, { etiqueta, tipos }]) => ({
        clave,
        etiqueta,
        cantidad: await db.actividad.count({ where: { ...base, tipo: { in: tipos } } }),
      }))
    ),
  ]);

  const movimientos = actividades.map((actividad) => {
    const { icono, verbo } = PRESENTACION[actividad.tipo];

    // De que habla el renglon. `detalle` guarda el nombre al momento del
    // movimiento y sirve de respaldo si la relacion viniera vacia.
    const titulo =
      actividad.lead?.nombre ??
      actividad.venta?.nombreCliente ??
      actividad.cliente?.nombre ??
      actividad.detalle ??
      "—";

    // No hay ficha de lead en /admin: lo mas cerca que se llega es buscarlo en
    // el listado por su nombre.
    const href = actividad.venta
      ? `/admin/ventas/${actividad.venta.id}`
      : actividad.cliente
        ? `/admin/clientes/${actividad.cliente.id}`
        : actividad.lead
          ? `/admin/leads?q=${encodeURIComponent(actividad.lead.nombre)}`
          : null;

    return {
      id: actividad.id,
      icono,
      verbo,
      titulo,
      href,
      // En el alta y en la asignacion el detalle es texto informativo; en el
      // cambio de estado y en la anulacion es lo que escribio la persona.
      detalle: actividad.lead || actividad.tipo === "VENTA_ALTA" ? actividad.detalle : null,
      motivo:
        actividad.tipo === "VENTA_ANULACION" || actividad.tipo === "LEAD_CAMBIO_ESTADO"
          ? actividad.detalle
          : null,
      estadoAnterior: actividad.estadoAnterior,
      estadoNuevo: actividad.estadoNuevo,
      cambios: actividad.cambios,
      vendedor: actividad.vendedor?.nombreCompleto ?? null,
      actor: actividad.actor?.nombre ?? "Sistema",
      fecha: actividad.createdAt,
    };
  });

  const enlace = (extra: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const valores = {
      vendedor: vendedorId ?? undefined,
      tipo: familia ?? undefined,
      ...extra,
    };
    for (const [clave, valor] of Object.entries(valores)) {
      if (valor) params.set(clave, valor);
    }
    const query = params.toString();
    return query ? `/admin/actividad?${query}` : "/admin/actividad";
  };

  const paginas = Math.ceil(total / POR_PAGINA);
  const vendedorElegido = vendedores.find((vendedor) => vendedor.id === vendedorId);

  return (
    <>
      <PageHeader
        titulo="Actividad"
        descripcion="Todo lo que pasa en la zona: leads, ventas y correcciones de datos del cliente."
      />

      <form className="mb-3 flex max-w-md flex-wrap gap-2">
        {/* La familia viaja escondida para no perderla al cambiar de vendedor. */}
        {familia ? <input type="hidden" name="tipo" value={familia} /> : null}
        <label htmlFor="vendedor" className="sr-only">
          Vendedor
        </label>
        <select
          id="vendedor"
          name="vendedor"
          defaultValue={vendedorId ?? ""}
          className="h-9 min-w-0 flex-1 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <option value="">Todos los vendedores</option>
          {vendedores.map((vendedor) => (
            <option key={vendedor.id} value={vendedor.id}>
              {vendedor.nombreCompleto}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
      </form>

      <div className="mb-4 flex flex-wrap gap-2">
        <Button variant={familia ? "outline" : "secondary"} size="sm" asChild>
          <Link href={enlace({ tipo: undefined, pagina: undefined })}>Todo</Link>
        </Button>
        {conteos.map(({ clave, etiqueta, cantidad }) => (
          <Button
            key={clave}
            variant={familia === clave ? "secondary" : "outline"}
            size="sm"
            asChild
          >
            <Link href={enlace({ tipo: clave, pagina: undefined })}>
              {etiqueta}
              <span className="tabular-nums text-muted-foreground">{cantidad}</span>
            </Link>
          </Button>
        ))}
      </div>

      {total === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Activity className="size-8 text-muted-foreground" />
            <div>
              <p className="font-medium">
                {vendedorElegido
                  ? `Sin movimientos de ${vendedorElegido.nombreCompleto}`
                  : familia
                    ? `Sin movimientos de ${FAMILIAS[familia].etiqueta.toLowerCase()}`
                    : "Todavía no hay movimientos"}
              </p>
              <p className="text-sm text-muted-foreground">
                Acá se registra cada lead que asignás, cada venta que se carga, se corrige o
                se anula, y cada dato de cliente que cambiás a mano.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="mb-2 text-sm text-muted-foreground">
            {total.toLocaleString("es-AR")} movimiento{total === 1 ? "" : "s"}
            {vendedorElegido ? ` de ${vendedorElegido.nombreCompleto}` : ""}
          </p>

          {/* Tarjetas en el celular y la lista de siempre en el escritorio. */}
          <ListaTarjetas>
            {movimientos.map((movimiento) => (
              <TarjetaFila
                key={movimiento.id}
                href={movimiento.href ?? undefined}
                lateral={FECHA.format(movimiento.fecha)}
                encabezado={
                  <>
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <movimiento.icono className="size-3.5" />
                      {movimiento.verbo}
                    </p>
                    <p className="mt-0.5 truncate font-medium">{movimiento.titulo}</p>
                    {movimiento.estadoNuevo ? (
                      <p className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {movimiento.estadoAnterior ? (
                          <BadgeEstado estado={movimiento.estadoAnterior} />
                        ) : null}
                        <ArrowRight className="size-3 text-muted-foreground" />
                        <BadgeEstado estado={movimiento.estadoNuevo} />
                      </p>
                    ) : null}
                    {movimiento.detalle ? (
                      <p className="mt-1 text-xs text-muted-foreground">{movimiento.detalle}</p>
                    ) : null}
                    {movimiento.motivo ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        &ldquo;{movimiento.motivo}&rdquo;
                      </p>
                    ) : null}
                    <ListaCambios
                      cambios={movimiento.cambios}
                      className="mt-1.5 space-y-0.5 text-xs"
                    />
                  </>
                }
              >
                <DatoFila etiqueta="Vendedor" valor={movimiento.vendedor} />
                <DatoFila etiqueta="Lo hizo" valor={movimiento.actor} />
              </TarjetaFila>
            ))}
          </ListaTarjetas>

          <Card className="hidden md:block">
            <ul className="divide-y">
              {movimientos.map((movimiento) => (
                <li key={movimiento.id} className="flex flex-wrap items-start gap-3 p-4">
                  <span className="mt-0.5 text-muted-foreground" title={movimiento.verbo}>
                    <movimiento.icono className="size-4" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="text-muted-foreground">{movimiento.verbo}</span>
                      {movimiento.href ? (
                        <Link
                          href={movimiento.href}
                          className="font-medium underline underline-offset-2"
                        >
                          {movimiento.titulo}
                        </Link>
                      ) : (
                        <span className="font-medium">{movimiento.titulo}</span>
                      )}
                    </p>

                    {movimiento.estadoNuevo ? (
                      <p className="mt-1 flex flex-wrap items-center gap-2">
                        {movimiento.estadoAnterior ? (
                          <BadgeEstado estado={movimiento.estadoAnterior} />
                        ) : null}
                        <ArrowRight className="size-3 text-muted-foreground" />
                        <BadgeEstado estado={movimiento.estadoNuevo} />
                      </p>
                    ) : null}

                    {movimiento.detalle ? (
                      <p className="mt-1 text-sm text-muted-foreground">{movimiento.detalle}</p>
                    ) : null}

                    {movimiento.motivo ? (
                      <p className="mt-1 text-sm text-muted-foreground">
                        &ldquo;{movimiento.motivo}&rdquo;
                      </p>
                    ) : null}

                    <ListaCambios cambios={movimiento.cambios} className="mt-1 space-y-1 text-sm" />
                  </div>

                  <div className="text-right text-xs text-muted-foreground">
                    {/* El vendedor es a nombre de quien queda; el actor, quien
                        apreto el boton. Cuando Balta carga una venta ajena, no
                        son la misma persona. */}
                    {movimiento.vendedor ? <p>{movimiento.vendedor}</p> : null}
                    {movimiento.vendedor !== movimiento.actor ? (
                      <p>por {movimiento.actor}</p>
                    ) : null}
                    <p>{FECHA.format(movimiento.fecha)}</p>
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
                  {/* El enlace conserva los filtros: antes volvia al feed sin
                      ellos y la pagina 2 mostraba otra cosa. */}
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
