import { EnConstruccion } from "@/components/layout/en-construccion";
import { PageHeader } from "@/components/layout/page-header";

export default function Page() {
  return (
    <>
      <PageHeader titulo="Mis leads" descripcion="Leads que te asignaron." />
      <EnConstruccion fase="Fase 4" />
    </>
  );
}
