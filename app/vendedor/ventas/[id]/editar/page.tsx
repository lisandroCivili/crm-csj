import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { VentaForm } from "@/components/ventas/venta-form";
import { db } from "@/lib/db";
import { requireVendedor } from "@/lib/sesion";

export default async function EditarVentaPage({
  params,
}: PageProps<"/vendedor/ventas/[id]/editar">) {
  const usuario = await requireVendedor();
  const { id } = await params;

  const [venta, planes] = await Promise.all([
    db.venta.findFirst({
      where: { id, vendedorId: usuario.vendedorId },
      include: { adjuntos: { select: { tipo: true } } },
    }),
    db.plan.findMany({
      where: { activo: true },
      orderBy: { codigoProducto: "asc" },
      include: { precios: { orderBy: { vigenteDesde: "desc" }, take: 1 } },
    }),
  ]);

  if (!venta) notFound();

  return (
    <>
      <PageHeader
        titulo="Editar venta"
        descripcion={`${venta.nombreCliente} · cada cambio queda registrado en el historial.`}
      />
      <VentaForm
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
