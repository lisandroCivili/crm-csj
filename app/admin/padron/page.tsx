import { EnConstruccion } from "@/components/layout/en-construccion";
import { PageHeader } from "@/components/layout/page-header";

export default function Page() {
  return (
    <>
      <PageHeader titulo="Padrón" descripcion="Importación de los padrones que envía el club." />
      <EnConstruccion fase="Fase 3" />
    </>
  );
}
