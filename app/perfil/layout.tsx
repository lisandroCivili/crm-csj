import { AppShell } from "@/components/layout/app-shell";
import { requireUsuario } from "@/lib/sesion";

/**
 * El perfil es la misma pantalla para los dos roles, asi que vive fuera de
 * /admin y /vendedor. El middleware la protege igual: solo separa por esos dos
 * prefijos, y sin sesion nadie pasa.
 */
export default async function PerfilLayout({ children }: LayoutProps<"/perfil">) {
  const usuario = await requireUsuario();
  return <AppShell usuario={usuario}>{children}</AppShell>;
}
