import { EnConstruccion } from "@/components/layout/en-construccion";
import { PageHeader } from "@/components/layout/page-header";

export default function Page() {
  return (
    <>
      <PageHeader titulo="Ventas" descripcion="Todas las ventas cargadas por el equipo." />
      <EnConstruccion fase="Fase 5" />
    </>
  );
}
