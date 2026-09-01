import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { VentaForm } from "@/components/ventas/venta-form";
import { db } from "@/lib/db";
import { requireAdmin, requireZonaActivaId } from "@/lib/sesion";

export default async function EditarVentaAdminPage({
  params,
}: PageProps<"/admin/ventas/[id]/editar">) {
  await requireAdmin();
  const zonaId = await requireZonaActivaId();
  const { id } = await params;

  const venta = await db.venta.findFirst({
    where: { id, zonaId },
    include: { adjuntos: { select: { tipo: true } } },
  });

  if (!venta) notFound();
  // La accion tambien lo rechaza; esto evita mostrar un formulario que no va a
  // poder guardar.
  if (venta.estado === "ANULADA") redirect(`/admin/ventas/${venta.id}`);

  const planes = await db.plan.findMany({
    // Un plan dado de baja no se ofrece, pero el de esta venta se conserva:
    // corregir un telefono no tiene por que obligar a cambiarle el plan a una
    // venta vieja. Sin esto el select no encontraria su valor y aparecia vacio.
    where: { OR: [{ activo: true }, ...(venta.planId ? [{ id: venta.planId }] : [])] },
    orderBy: { codigoProducto: "asc" },
    include: { precios: { orderBy: { vigenteDesde: "desc" }, take: 1 } },
  });

  return (
    <>
      <PageHeader
        titulo="Editar venta"
        descripcion={`${venta.nombreCliente} · cada cambio queda registrado en el historial.`}
      />
      <VentaForm
        admin
        planes={planes.map((plan) => ({
          id: plan.id,
          codigoProducto: plan.codigoProducto,
          nombre: plan.nombre,
          precio: plan.precios[0] ? Number(plan.precios[0].precio) : null,
        }))}
        valores={venta}
        tieneDni={venta.adjuntos.some((adjunto) => adjunto.tipo === "DNI")}
      />
    </>
  );
}
