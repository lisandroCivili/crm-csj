import { AppShell } from "@/components/layout/app-shell";
import { requireAdmin, requireZonaActivaId } from "@/lib/sesion";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const usuario = await requireAdmin();
  // Nadie opera sin zona activa: si todavia no eligio, va al selector.
  await requireZonaActivaId();

  return <AppShell usuario={usuario}>{children}</AppShell>;
}
