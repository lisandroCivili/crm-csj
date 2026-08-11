import { PageHeader } from "@/components/layout/page-header";
import { ImportarLeads } from "@/components/leads/importar-leads";
import { requireAdmin, requireZonaActivaId } from "@/lib/sesion";

export default async function ImportarLeadsPage() {
  await requireAdmin();
  await requireZonaActivaId();

  return (
    <>
      <PageHeader
        titulo="Importar leads"
        descripcion="Los leads quedan en la zona que tenés activa."
      />
      <ImportarLeads />
    </>
  );
}
