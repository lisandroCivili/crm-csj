import { EnConstruccion } from "@/components/layout/en-construccion";
import { PageHeader } from "@/components/layout/page-header";

export default function Page() {
  return (
    <>
      <PageHeader titulo="Leads" descripcion="Importación, asignación y seguimiento de leads." />
      <EnConstruccion fase="Fase 4" />
    </>
  );
}
