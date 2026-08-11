import { EnConstruccion } from "@/components/layout/en-construccion";
import { PageHeader } from "@/components/layout/page-header";

export default function Page() {
  return (
    <>
      <PageHeader titulo="Comisiones" descripcion="Escalas, liquidación y cierre por período." />
      <EnConstruccion fase="Fase 7" />
    </>
  );
}
