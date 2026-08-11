import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { VendedorForm } from "@/components/vendedores/vendedor-form";
import { db } from "@/lib/db";
import { requireAdmin, requireZonaActivaId } from "@/lib/sesion";

export default async function EditarVendedorPage({
  params,
}: PageProps<"/admin/vendedores/[id]/editar">) {
  await requireAdmin();
  const zonaId = await requireZonaActivaId();
  const { id } = await params;

  const vendedor = await db.vendedor.findFirst({ where: { id, zonaId } });
  if (!vendedor) notFound();

  return (
    <>
      <PageHeader titulo="Editar vendedor" descripcion={vendedor.nombreCompleto} />
      <VendedorForm valores={vendedor} />
    </>
  );
}
