import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BadgeDollarSign,
  ClipboardList,
  FileSpreadsheet,
  FlaskConical,
  LayoutDashboard,
  Package,
  ScrollText,
  Users,
  UserSquare,
} from "lucide-react";
import type { Permisos } from "./sesion";
import type { Role } from "./generated/prisma/client";

/**
 * Una ruta a la que se puede volver sin salir del sistema.
 *
 * `startsWith("/")` no alcanza: `//otro-sitio.com` tambien empieza con barra y
 * el navegador la lee como una URL absoluta con el protocolo actual, asi que un
 * "volve a donde estabas" se convierte en un salto afuera. `/\otro-sitio.com`
 * hace lo mismo en varios navegadores.
 */
export function rutaInterna(valor: unknown, porDefecto = "/"): string {
  if (typeof valor !== "string" || !valor.startsWith("/")) return porDefecto;
  if (valor.startsWith("//") || valor.startsWith("/\\")) return porDefecto;
  return valor;
}

export type ItemNav = {
  href: string;
  etiqueta: string;
  icono: LucideIcon;
  /** Si esta presente, el item solo aparece cuando el permiso esta en true. */
  permiso?: keyof Permisos;
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
  // Solo en desarrollo: vaciar el padron y recargarlo con datos ficticios. La
  // pagina ademas devuelve 404 en produccion, porque esconder el item del menu
  // no es seguridad: la URL se puede escribir a mano.
  ...(process.env.NODE_ENV === "production"
    ? []
    : [{ href: "/admin/laboratorio", etiqueta: "Laboratorio", icono: FlaskConical }]),
];

// El dashboard nunca lleva permiso: es la ruta a la que se vuelve cuando falta
// uno, asi que sacarla dejaria al vendedor rebotando contra su propia pantalla.
const VENDEDOR: ItemNav[] = [
  { href: "/vendedor/dashboard", etiqueta: "Dashboard", icono: LayoutDashboard },
  { href: "/vendedor/leads", etiqueta: "Mis leads", icono: ClipboardList, permiso: "verLeads" },
  { href: "/vendedor/ventas", etiqueta: "Mis ventas", icono: ScrollText, permiso: "cargarVentas" },
];

export const NAVEGACION: Record<Role, ItemNav[]> = { ADMIN, VENDEDOR };

/**
 * El menu que le corresponde a un usuario. Esconder el item no alcanza como
 * seguridad —cada pagina vuelve a chequear el permiso—, pero evita ofrecerle
 * una seccion a la que no va a poder entrar.
 */
export function itemsVisibles(role: Role, permisos: Permisos): ItemNav[] {
  return NAVEGACION[role].filter((item) => !item.permiso || permisos[item.permiso]);
}
