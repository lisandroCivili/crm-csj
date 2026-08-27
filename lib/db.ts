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
 * milisegundos de espera que solo se pagan contra la base local.
 *
 * El corte mira el host y no `NODE_ENV`: los scripts de `scripts/` tambien
 * pegan contra esta base y corren sin `NODE_ENV=development`, asi que con esa
 * condicion se quedaban sin el limite y se caian con "Connection terminated
 * unexpectedly". En produccion el host es el de Railway y manda el
 * `connection_limit` de la URL, que es lo que espera el Postgres administrado.
 */
function esBaseLocal(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  } catch {
    return false;
  }
}

const MAX_CONEXIONES = esBaseLocal(connectionString) ? 4 : undefined;

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg({ connectionString, max: MAX_CONEXIONES }),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
