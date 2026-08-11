import { AppShell } from "@/components/layout/app-shell";
import { requireVendedor } from "@/lib/sesion";

export default async function VendedorLayout({ children }: LayoutProps<"/vendedor">) {
  const usuario = await requireVendedor();

  return <AppShell usuario={usuario}>{children}</AppShell>;
}
