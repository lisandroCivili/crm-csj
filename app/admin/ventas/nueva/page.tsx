import { PageHeader } from "@/components/layout/page-header";
import { VentaForm } from "@/components/ventas/venta-form";
import { db } from "@/lib/db";
import { getVendedorDelAdmin, requireAdmin, requireZonaActivaId } from "@/lib/sesion";

/**
 * Alta de venta desde /admin. Balta y Pedro son agentes: ademas de administrar
 * venden, y cobran comision por sus propios titulos.
 *
 * El vendedor se elige de una lista en vez de salir de la sesion, asi tambien
 * pueden cargarle una venta a alguien del equipo que no usa el sistema. Por
 * defecto viene su propia ficha en la zona activa, que es el caso comun.
 */
export default async function NuevaVentaAdminPage() {
  await requireAdmin();
  const zonaId = await requireZonaActivaId();

  const [planes, vendedores, propio] = await Promise.all([
    db.plan.findMany({
      where: { activo: true },
      orderBy: { codigoProducto: "asc" },
      include: { precios: { orderBy: { vigenteDesde: "desc" }, take: 1 } },
    }),
    db.vendedor.findMany({
      where: { zonaId, activo: true },
      orderBy: { nombreCompleto: "asc" },
      select: { id: true, nombreCompleto: true, codigo: true },
    }),
    getVendedorDelAdmin(),
  ]);

  return (
    <>
      <PageHeader
        titulo="Nueva venta"
        descripcion="Cargá los datos del cliente y el plan. Elegí a nombre de quién queda la venta."
      />
      <VentaForm
        planes={planes.map((plan) => ({
          id: plan.id,
          codigoProducto: plan.codigoProducto,
          nombre: plan.nombre,
          precio: plan.precios[0] ? Number(plan.precios[0].precio) : null,
        }))}
        vendedores={vendedores}
        vendedorPorDefecto={propio?.id ?? null}
      />
    </>
  );
}
