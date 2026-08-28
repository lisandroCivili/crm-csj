import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { PlanForm } from "@/components/planes/plan-form";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/sesion";

export default async function EditarPlanPage({
  params,
}: PageProps<"/admin/planes/[id]/editar">) {
  await requireAdmin();
  const { id } = await params;

  const plan = await db.plan.findUnique({
    where: { id },
    select: {
      id: true,
      codigoProducto: true,
      nombre: true,
      duracionMeses: true,
      activo: true,
    },
  });
  if (!plan) notFound();

  return (
    <>
      <PageHeader
        titulo="Editar plan"
        descripcion={`${plan.codigoProducto} — ${plan.nombre}`}
      />
      <PlanForm valores={plan} />
    </>
  );
}
