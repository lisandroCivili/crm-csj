import { EnConstruccion } from "@/components/layout/en-construccion";
import { PageHeader } from "@/components/layout/page-header";

export default function Page() {
  return (
    <>
      <PageHeader titulo="Planes" descripcion="Catálogo de productos y lista de precios." />
      <EnConstruccion fase="Fase 5" />
    </>
  );
}
