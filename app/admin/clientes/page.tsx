import { EnConstruccion } from "@/components/layout/en-construccion";
import { PageHeader } from "@/components/layout/page-header";

export default function Page() {
  return (
    <>
      <PageHeader titulo="Clientes" descripcion="Padrón de clientes con sus títulos y cuotas." />
      <EnConstruccion fase="Fase 3" />
    </>
  );
}
