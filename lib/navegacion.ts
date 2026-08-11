import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BadgeDollarSign,
  ClipboardList,
  FileSpreadsheet,
  LayoutDashboard,
  Package,
  ScrollText,
  Users,
  UserSquare,
} from "lucide-react";
import type { Role } from "./generated/prisma/client";

export type ItemNav = {
  href: string;
  etiqueta: string;
  icono: LucideIcon;
};

const ADMIN: ItemNav[] = [
  { href: "/admin/dashboard", etiqueta: "Dashboard", icono: LayoutDashboard },
  { href: "/admin/leads", etiqueta: "Leads", icono: ClipboardList },
  { href: "/admin/actividad", etiqueta: "Actividad", icono: Activity },
  { href: "/admin/padron", etiqueta: "Padrón", icono: FileSpreadsheet },
  { href: "/admin/clientes", etiqueta: "Clientes", icono: Users },
  { href: "/admin/vendedores", etiqueta: "Vendedores", icono: UserSquare },
  { href: "/admin/ventas", etiqueta: "Ventas", icono: ScrollText },
  { href: "/admin/planes", etiqueta: "Planes", icono: Package },
  { href: "/admin/comisiones", etiqueta: "Comisiones", icono: BadgeDollarSign },
];

const VENDEDOR: ItemNav[] = [
  { href: "/vendedor/dashboard", etiqueta: "Dashboard", icono: LayoutDashboard },
  { href: "/vendedor/leads", etiqueta: "Mis leads", icono: ClipboardList },
  { href: "/vendedor/ventas", etiqueta: "Mis ventas", icono: ScrollText },
];

export const NAVEGACION: Record<Role, ItemNav[]> = { ADMIN, VENDEDOR };
