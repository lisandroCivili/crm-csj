import { PageHeader } from "@/components/layout/page-header";
import { ImportarPrecios } from "@/components/planes/importar-precios";
import { requireAdmin } from "@/lib/sesion";

export default async function ImportarPreciosPage() {
  await requireAdmin();

  return (
    <>
      <PageHeader
        titulo="Cargar precios"
        descripcion="La lista rige desde el primer día del mes en curso."
      />
      <ImportarPrecios />
    </>
  );
}
