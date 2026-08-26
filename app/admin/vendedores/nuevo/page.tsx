import { PageHeader } from "@/components/layout/page-header";
import { VendedorForm } from "@/components/vendedores/vendedor-form";
import { db } from "@/lib/db";
import { requireAdmin, requireZonaActivaId } from "@/lib/sesion";

export default async function NuevoVendedorPage() {
  await requireAdmin();
  await requireZonaActivaId();

  const escalas = await db.escala.findMany({
    orderBy: [{ esPredeterminada: "desc" }, { nombre: "asc" }],
    select: { id: true, nombre: true, esPredeterminada: true },
  });

  return (
    <>
      <PageHeader
        titulo="Nuevo vendedor"
        descripcion="Queda registrado en la zona que tenés activa."
      />
      <VendedorForm escalas={escalas} />
    </>
  );
}
