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

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
