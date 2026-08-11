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
          include: { vendedor: { select: { id: true, zonaId: true, activo: true } } },
        });

        if (!user || !user.activo) return null;

        const passwordOk = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!passwordOk) return null;

        // Un vendedor dado de baja no entra aunque su usuario siga activo.
        if (user.role === "VENDEDOR" && !user.vendedor?.activo) return null;

        return {
          id: user.id,
          email: user.email,
          nombre: user.nombre,
          role: user.role,
          vendedorId: user.vendedor?.id ?? null,
          zonaIdFija: user.vendedor?.zonaId ?? null,
        };
      },
    }),
  ],
});
