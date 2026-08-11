import { EnConstruccion } from "@/components/layout/en-construccion";
import { PageHeader } from "@/components/layout/page-header";

export default function Page() {
  return (
    <>
      <PageHeader titulo="Mis ventas" descripcion="Ventas que cargaste." />
      <EnConstruccion fase="Fase 5" />
    </>
  );
}
