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
    <nav className="grid gap-1 px-3">
      {items.map(({ href, etiqueta, icono: Icono }) => {
        const activo = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              activo
                ? "bg-accent font-medium text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            )}
          >
            <Icono className="size-4 shrink-0" />
            {etiqueta}
          </Link>
        );
      })}
    </nav>
  );
}
