"use client";

import * as React from "react";
import { Dialog as SheetPrimitive, VisuallyHidden } from "radix-ui";

import { cn } from "@/lib/utils";

/**
 * Panel que entra desde el borde. Se apoya en el mismo primitivo que el Dialog
 * (radix-ui trae Dialog y VisuallyHidden, no hace falta instalar nada) y sigue
 * las variantes `data-open` / `data-closed` que define shadcn/tailwind.css.
 *
 * Solo trae lo que usa el menu de navegacion en celular: sin cabecera propia ni
 * boton de cierre, porque el panel se cierra al tocar un link.
 */

function Sheet({ ...props }: React.ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetTrigger({ ...props }: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose({ ...props }: React.ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

function SheetTitle({ ...props }: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return <SheetPrimitive.Title data-slot="sheet-title" {...props} />;
}

function SheetContent({
  className,
  children,
  side = "left",
  titulo,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: "left" | "right";
  /** Titulo accesible. Va oculto: Radix lo exige aunque el panel no lo muestre. */
  titulo: string;
}) {
  return (
    <SheetPrimitive.Portal data-slot="sheet-portal">
      <SheetPrimitive.Overlay
        data-slot="sheet-overlay"
        className="fixed inset-0 isolate z-50 bg-black/25 duration-150 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
      />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        className={cn(
          "fixed inset-y-0 z-50 flex h-full w-72 max-w-[85vw] flex-col bg-sidebar duration-200 outline-none",
          side === "left"
            ? "left-0 data-open:slide-in-from-left data-closed:slide-out-to-left"
            : "right-0 data-open:slide-in-from-right data-closed:slide-out-to-right",
          "data-open:animate-in data-closed:animate-out",
          className
        )}
        {...props}
      >
        <VisuallyHidden.Root>
          <SheetTitle>{titulo}</SheetTitle>
        </VisuallyHidden.Root>
        {children}
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}

export { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger };
