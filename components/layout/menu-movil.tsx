"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Marca } from "./marca";
import { NavLinks } from "./nav-links";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import type { Permisos } from "@/lib/sesion";
import type { Role } from "@/lib/generated/prisma/client";

/**
 * La navegacion en celular. La barra lateral esta oculta por debajo de 768px,
 * asi que sin esto no hay forma de cambiar de seccion desde el telefono.
 *
 * Reutiliza `NavLinks` tal cual: usa tokens `sidebar-*`, los mismos que pinta
 * el panel de escritorio.
 *
 * **El panel maneja su propio `abierto` y cierra en el click, a proposito.**
 * Antes los links iban envueltos en un `SheetClose asChild`, y no cerraba
 * nunca: `next/link` llama a `preventDefault()` para navegar del lado del
 * cliente, y Radix compone sus handlers con `checkForDefaultPrevented`, asi que
 * al llegar el evento al `SheetClose` ya venia con `defaultPrevented` y el
 * cierre se salteaba. Se navegaba con el menu tapando la pantalla.
 *
 * Cerrar en el click y no al cambiar de ruta cubre el caso de tocar el link de
 * la pagina en la que ya se esta parado, donde `usePathname` no cambia.
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
  const [abierto, setAbierto] = useState(false);

  return (
    <Sheet open={abierto} onOpenChange={setAbierto}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon-lg" className="md:hidden" aria-label="Abrir menú">
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>

      <SheetContent titulo="Menú" className="py-5">
        <Marca invertido bajada={bajada} className="px-5 pb-6" />

        {/* El click sube desde el <a>; con Enter el navegador tambien dispara
            un click, asi que no hace falta manejar el teclado aparte. */}
        <div onClick={() => setAbierto(false)}>
          <NavLinks role={role} permisos={permisos} />
        </div>

        <p className="mt-auto px-5 pt-6 text-[0.68rem] leading-relaxed text-white/35">
          Capitalización y Ahorro
        </p>
      </SheetContent>
    </Sheet>
  );
}
