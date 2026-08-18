import { PageHeader } from "@/components/layout/page-header";
import { VentaForm } from "@/components/ventas/venta-form";
import { db } from "@/lib/db";
import { requirePermiso } from "@/lib/sesion";

export default async function NuevaVentaPage({
  searchParams,
}: PageProps<"/vendedor/ventas/nueva">) {
  const usuario = await requirePermiso("cargarVentas");
  const parametros = await searchParams;
  const leadId = typeof parametros.lead === "string" ? parametros.lead : undefined;

  const [planes, lead] = await Promise.all([
    db.plan.findMany({
      where: { activo: true },
      orderBy: { codigoProducto: "asc" },
      include: { precios: { orderBy: { vigenteDesde: "desc" }, take: 1 } },
    }),
    leadId
      ? db.lead.findFirst({
          where: { id: leadId, vendedorAsignadoId: usuario.vendedorId },
          select: {
            id: true,
            nombre: true,
            telefono: true,
            direccion: true,
            localidad: true,
            provincia: true,
          },
        })
      : null,
  ]);

  return (
    <>
      <PageHeader
        titulo="Nueva venta"
        descripcion={
          lead ? `A partir del lead de ${lead.nombre}.` : "Cargá los datos del cliente y el plan."
        }
      />
      <VentaForm
        planes={planes.map((plan) => ({
          id: plan.id,
          codigoProducto: plan.codigoProducto,
          nombre: plan.nombre,
          precio: plan.precios[0] ? Number(plan.precios[0].precio) : null,
        }))}
        leadId={lead?.id}
        // Los datos del lead ya vienen cargados: el vendedor solo completa lo
        // que falta en vez de tipear de nuevo lo que ya tiene.
        valores={
          lead
            ? {
                nombreCliente: lead.nombre,
                telefono: lead.telefono,
                direccion: lead.direccion,
                localidad: lead.localidad,
                provincia: lead.provincia,
              }
            : undefined
        }
      />
    </>
  );
}
