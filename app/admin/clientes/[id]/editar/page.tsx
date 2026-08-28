import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { ClienteForm } from "@/components/clientes/cliente-form";
import { db } from "@/lib/db";
import { requireAdmin, requireZonaActivaId } from "@/lib/sesion";

export default async function EditarClientePage({
  params,
}: PageProps<"/admin/clientes/[id]/editar">) {
  await requireAdmin();
  const zonaId = await requireZonaActivaId();
  const { id } = await params;

  const cliente = await db.cliente.findFirst({ where: { id, zonaId } });
  if (!cliente) notFound();

  return (
    <>
      <PageHeader
        titulo="Corregir datos del cliente"
        descripcion={`${cliente.nombre} · DNI ${cliente.dni}`}
      />
      <ClienteForm valores={cliente} />
    </>
  );
}
