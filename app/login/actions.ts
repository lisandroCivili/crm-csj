"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";

export type EstadoLogin = { error?: string };

export async function login(
  _estadoPrevio: EstadoLogin,
  formData: FormData
): Promise<EstadoLogin> {
  const volverA = String(formData.get("volverA") || "/");

  try {
    // signIn redirige en caso de exito lanzando NEXT_REDIRECT, que no es un
    // AuthError y por lo tanto se propaga solo.
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: volverA,
    });
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      // No distinguimos "usuario inexistente" de "password incorrecta" para no
      // filtrar que direcciones estan registradas.
      return { error: "Email o contraseña incorrectos." };
    }
    throw error;
  }
}
