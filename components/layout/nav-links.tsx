"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAVEGACION } from "@/lib/navegacion";
import type { Role } from "@/lib/generated/prisma/client";

/**
 * Recibe el rol y no la lista ya resuelta: los items llevan componentes de
 * icono, y una funcion no se puede serializar desde un Server Component.
 */
export function NavLinks({ role }: { role: Role }) {
  const pathname = usePathname();
  const items = NAVEGACION[role];

  return (
    <nav className="grid gap-0.5 px-3">
      {items.map(({ href, etiqueta, icono: Icono }) => {
        const activo = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            aria-current={activo ? "page" : undefined}
            className={cn(
              "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
              activo
                ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
            )}
          >
            {/* La barra roja marca la posicion sin depender solo del fondo. */}
            <span
              className={cn(
                "absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-sidebar-primary transition-opacity",
                activo ? "opacity-100" : "opacity-0"
              )}
            />
            <Icono
              className={cn(
                "size-[1.05rem] shrink-0 transition-colors",
                activo ? "text-sidebar-primary" : "text-sidebar-foreground/60 group-hover:text-sidebar-foreground"
              )}
            />
            {etiqueta}
          </Link>
        );
      })}
    </nav>
  );
}
