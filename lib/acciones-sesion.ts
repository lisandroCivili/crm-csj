"use server";

import { cookies } from "next/headers";
import { signOut } from "./auth";
import { ZONA_COOKIE } from "./constantes";

export async function cerrarSesion() {
  (await cookies()).delete(ZONA_COOKIE);
  await signOut({ redirectTo: "/login" });
}
