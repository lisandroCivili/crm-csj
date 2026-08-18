import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

// El datasource del schema no declara `url` (en Prisma 7 esa configuracion vive
// en prisma.config.ts, que solo lee la CLI) y ademas Prisma 7 se conecta a
// traves de un driver adapter, asi que la conexion se arma aca.
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "Falta DATABASE_URL. En desarrollo se obtiene corriendo `npx prisma dev`."
  );
}

// En desarrollo Next.js recarga los modulos en caliente, y cada recarga crearia
// una conexion nueva hasta agotar el pool. Guardamos la instancia en el objeto
// global para reutilizarla.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * El Postgres que levanta `prisma dev` corta la conexion pasadas ~9 en paralelo,
 * y una pagina como el dashboard dispara mas que eso en un solo `Promise.all`.
 * Con el pool en 4 las consultas se encolan y ninguna se cae; el costo es unos
 * milisegundos de espera que solo se pagan en desarrollo.
 *
 * En produccion manda el `connection_limit` de la URL, que es lo que espera el
 * Postgres administrado.
 */
const MAX_CONEXIONES = process.env.NODE_ENV === "development" ? 4 : undefined;

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg({ connectionString, max: MAX_CONEXIONES }),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
