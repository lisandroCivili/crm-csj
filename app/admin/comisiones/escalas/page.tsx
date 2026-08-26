import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ListaEscalas } from "@/components/comisiones/lista-escalas";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/sesion";

export default async function EscalasPage() {
  await requireAdmin();

  const escalas = await db.escala.findMany({
    orderBy: [{ esPredeterminada: "desc" }, { nombre: "asc" }],
    include: { _count: { select: { vendedores: true, filas: true } } },
  });

  return (
    <>
      <PageHeader
        titulo="Escalas de comisión"
        descripcion="Los tramos de ventas nuevas x % por cuota. Cada vendedor se asigna a una desde su ficha."
        acciones={
          <Button variant="outline" asChild>
            <Link href="/admin/comisiones">
              <ArrowLeft className="size-4" />
              Volver a la liquidación
            </Link>
          </Button>
        }
      />

      <ListaEscalas
        escalas={escalas.map((escala) => ({
          id: escala.id,
          nombre: escala.nombre,
          esPredeterminada: escala.esPredeterminada,
          cantidadTramos: escala._count.filas,
          cantidadVendedores: escala._count.vendedores,
        }))}
      />
    </>
  );
}
