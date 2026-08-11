import { EnConstruccion } from "@/components/layout/en-construccion";
import { PageHeader } from "@/components/layout/page-header";

export default function Page() {
  return (
    <>
      <PageHeader titulo="Vendedores" descripcion="Equipo de venta, perfiles y condiciones." />
      <EnConstruccion fase="Fase 2" />
    </>
  );
}
