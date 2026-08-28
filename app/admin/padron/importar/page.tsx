import { PageHeader } from "@/components/layout/page-header";
import { ImportarPadron } from "@/components/padron/importar-padron";
import { db } from "@/lib/db";
import { requireAdmin, requireZonaActivaId } from "@/lib/sesion";

export default async function ImportarPadronPage() {
  await requireAdmin();
  const zonaId = await requireZonaActivaId();

  const vendedores = await db.vendedor.findMany({
    where: { zonaId, activo: true },
    orderBy: { nombreCompleto: "asc" },
    select: { id: true, nombreCompleto: true, codigo: true },
  });

  return (
    <>
      <PageHeader
        titulo="Importar padrón"
        descripcion="Se pueden subir varios archivos de una vez, y el mismo archivo dos veces sin problema: lo que ya está cargado no se duplica."
      />
      <ImportarPadron vendedores={vendedores} />
    </>
  );
}
