import { Menu } from "lucide-react";
import { Marca } from "./marca";
import { NavLinks } from "./nav-links";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import type { Permisos } from "@/lib/sesion";
import type { Role } from "@/lib/generated/prisma/client";

/**
 * La navegacion en celular. La barra lateral esta oculta por debajo de 768px,
 * asi que sin esto no hay forma de cambiar de seccion desde el telefono.
 *
 * Reutiliza `NavLinks` tal cual: usa tokens `sidebar-*`, los mismos que pinta
 * el panel de escritorio.
 *
 * El panel se cierra solo porque los links van envueltos en `SheetClose`: al
 * tocar cualquiera, Radix cierra. Asi no hace falta estado propio ni escuchar
 * la ruta, y sirve igual cuando se toca el link de la pagina en la que ya se
 * esta parado.
 */
export function MenuMovil({
  role,
  permisos,
  bajada,
}: {
  role: Role;
  permisos: Permisos;
  bajada: string;
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon-lg" className="md:hidden" aria-label="Abrir menú">
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>

      <SheetContent titulo="Menú" className="py-5">
        <Marca invertido bajada={bajada} className="px-5 pb-6" />

        <SheetClose asChild>
          <div>
            <NavLinks role={role} permisos={permisos} />
          </div>
        </SheetClose>

        <p className="mt-auto px-5 pt-6 text-[0.68rem] leading-relaxed text-white/35">
          Capitalización y Ahorro
        </p>
      </SheetContent>
    </Sheet>
  );
}
