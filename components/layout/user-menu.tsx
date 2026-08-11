"use client";

import { ChevronDown, LogOut, MapPin } from "lucide-react";
import Link from "next/link";
import { cerrarSesion } from "@/lib/acciones-sesion";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserMenu({
  nombre,
  email,
  puedeCambiarZona,
}: {
  nombre: string;
  email: string;
  puedeCambiarZona: boolean;
}) {
  const iniciales = nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join("")
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-2">
          <span className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
            {iniciales}
          </span>
          <span className="hidden text-sm sm:inline">{nombre.split(" ")[0]}</span>
          <ChevronDown className="size-4 opacity-60" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <p className="text-sm font-medium">{nombre}</p>
          <p className="text-xs text-muted-foreground">{email}</p>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {puedeCambiarZona ? (
          <DropdownMenuItem asChild>
            <Link href="/seleccionar-zona">
              <MapPin className="size-4" />
              Cambiar de zona
            </Link>
          </DropdownMenuItem>
        ) : null}

        <DropdownMenuItem asChild variant="destructive">
          <form action={cerrarSesion} className="w-full">
            <button type="submit" className="flex w-full items-center gap-2">
              <LogOut className="size-4" />
              Cerrar sesión
            </button>
          </form>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
