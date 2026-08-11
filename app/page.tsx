import { redirect } from "next/navigation";
import { RUTA_INICIO } from "@/lib/constantes";
import { requireUsuario } from "@/lib/sesion";

/**
 * El middleware ya resuelve la raiz, pero dejamos el redirect como respaldo
 * para navegaciones internas que no pasan por el.
 */
export default async function Home() {
  const usuario = await requireUsuario();
  redirect(RUTA_INICIO[usuario.role]);
}
