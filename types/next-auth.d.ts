/* eslint-disable @typescript-eslint/no-empty-object-type --
 * Ampliar una interfaz de otro modulo se escribe necesariamente como
 * `interface X extends Y {}`: el cuerpo vacio es la forma correcta aca. */
import type { DefaultSession } from "next-auth";
import type { DatosUsuario } from "@/lib/tipos-sesion";

// Los callbacks reciben los tipos de @auth/core, no los de next-auth: son
// interfaces distintas y augmentar solo "next-auth" deja `token` y `user` sin
// tipar dentro de los callbacks. Por eso se amplian los dos lados.

declare module "next-auth" {
  interface User extends DatosUsuario {}

  interface Session {
    user: DatosUsuario & { id: string } & DefaultSession["user"];
  }
}

declare module "@auth/core/types" {
  interface User extends DatosUsuario {}
}

declare module "next-auth/jwt" {
  interface JWT extends DatosUsuario {}
}

declare module "@auth/core/jwt" {
  interface JWT extends DatosUsuario {}
}
