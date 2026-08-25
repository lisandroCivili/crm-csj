import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authConfig } from "./auth.config";
import { db } from "./db";

const credencialesSchema = z.object({
  email: z.string().trim().min(1).email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credencialesSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await db.user.findUnique({
          where: { email: parsed.data.email.toLowerCase() },
          include: {
            vendedores: {
              select: { id: true, zonaId: true, activo: true },
              orderBy: { createdAt: "asc" },
            },
          },
        });

        if (!user || !user.activo) return null;

        const passwordOk = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!passwordOk) return null;

        // La ficha es por zona: el vendedor comun tiene una sola, y los admins
        // que ademas venden tienen una por zona, que aca no se puede elegir
        // todavia porque la zona activa se define despues de entrar.
        const ficha = user.role === "VENDEDOR" ? (user.vendedores[0] ?? null) : null;

        // Un vendedor dado de baja no entra aunque su usuario siga activo.
        if (user.role === "VENDEDOR" && !ficha?.activo) return null;

        return {
          id: user.id,
          email: user.email,
          nombre: user.nombre,
          role: user.role,
          vendedorId: ficha?.id ?? null,
          zonaIdFija: ficha?.zonaId ?? null,
        };
      },
    }),
  ],
});
