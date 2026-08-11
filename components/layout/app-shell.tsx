import type { ReactNode } from "react";
import { MapPin } from "lucide-react";
import { Marca } from "./marca";
import { NavLinks } from "./nav-links";
import { UserMenu } from "./user-menu";
import { getZonaActiva, type Usuario } from "@/lib/sesion";
import { Badge } from "@/components/ui/badge";

const ETIQUETA_ZONA: Record<string, string> = {
  SALTA: "Salta",
  TUCUMAN: "Tucumán",
};

export async function AppShell({
  usuario,
  children,
}: {
  usuario: Usuario;
  children: ReactNode;
}) {
  const zona = await getZonaActiva();

  return (
    <div className="flex min-h-full flex-1">
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-sidebar py-4 md:flex">
        <div className="px-4 pb-5">
          <Marca bajada={usuario.role === "ADMIN" ? "Administración" : "Vendedor"} />
        </div>
        <NavLinks role={usuario.role} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between gap-4 border-b px-4 md:px-6">
          {zona ? (
            <Badge variant="secondary" className="gap-1.5">
              <MapPin className="size-3.5" />
              {ETIQUETA_ZONA[zona.nombre] ?? zona.nombre}
            </Badge>
          ) : (
            <span />
          )}

          <UserMenu
            nombre={usuario.nombre}
            email={usuario.email ?? ""}
            puedeCambiarZona={usuario.role === "ADMIN"}
          />
        </header>

        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
