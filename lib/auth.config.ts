import type { NextAuthConfig } from "next-auth";

/**
 * Configuracion sin providers, apta para el runtime edge del middleware.
 *
 * El middleware necesita leer la sesion para decidir a donde mandar a cada
 * usuario, pero no puede tocar la base de datos (Prisma no corre en edge). Como
 * la sesion es JWT y ya lleva rol y zona, alcanza con esto. El provider de
 * credenciales, que si consulta la base, vive en lib/auth.ts.
 */
export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      // `user` solo llega al iniciar sesion, con lo que devolvio authorize().
      if (user) {
        token.role = user.role;
        token.nombre = user.nombre;
        token.vendedorId = user.vendedorId;
        token.zonaIdFija = user.zonaIdFija;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.sub ?? "";
      session.user.role = token.role;
      session.user.nombre = token.nombre;
      session.user.vendedorId = token.vendedorId;
      session.user.zonaIdFija = token.zonaIdFija;
      return session;
    },
  },
} satisfies NextAuthConfig;
