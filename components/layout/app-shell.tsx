import type { ReactNode } from "react";
import { MapPin } from "lucide-react";
import { Marca } from "./marca";
import { MenuMovil } from "./menu-movil";
import { NavLinks } from "./nav-links";
import { UserMenu } from "./user-menu";
import { getZonaActiva, type Usuario } from "@/lib/sesion";

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
  const bajada = usuario.role === "ADMIN" ? "Administración" : "Vendedor";

  return (
    <div className="flex min-h-full flex-1 bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col bg-sidebar py-5 md:flex">
        <div className="px-5 pb-6">
          <Marca invertido bajada={bajada} />
        </div>

        <NavLinks role={usuario.role} permisos={usuario.permisos} />

        <div className="mt-auto px-5 pt-6">
          <p className="text-[0.68rem] leading-relaxed text-white/35">
            Capitalización y Ahorro
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col md:pl-64">
        <header className="sticky top-0 z-10 flex h-16 items-center gap-3 border-b border-border/70 bg-background/85 px-4 backdrop-blur-sm md:px-8">
          <MenuMovil role={usuario.role} permisos={usuario.permisos} bajada={bajada} />

          {zona ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-sm font-medium ring-1 ring-border">
              <MapPin className="size-3.5 text-primary" />
              {ETIQUETA_ZONA[zona.nombre] ?? zona.nombre}
            </span>
          ) : null}

          <div className="ml-auto">
            <UserMenu
              nombre={usuario.nombre}
              email={usuario.email}
              puedeCambiarZona={usuario.role === "ADMIN"}
            />
          </div>
        </header>

        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
