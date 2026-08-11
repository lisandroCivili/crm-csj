import { PageHeader } from "@/components/layout/page-header";
import { VendedorForm } from "@/components/vendedores/vendedor-form";
import { requireAdmin, requireZonaActivaId } from "@/lib/sesion";

export default async function NuevoVendedorPage() {
  await requireAdmin();
  await requireZonaActivaId();

  return (
    <>
      <PageHeader
        titulo="Nuevo vendedor"
        descripcion="Queda registrado en la zona que tenés activa."
      />
      <VendedorForm />
    </>
  );
}
