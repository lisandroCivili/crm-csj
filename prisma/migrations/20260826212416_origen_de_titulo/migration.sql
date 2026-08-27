-- Fase 2: de donde salio cada titulo (venta nueva, renovacion o base) y las
-- metricas de la importacion que hasta ahora se calculaban pero no se guardaban.

-- CreateEnum
CREATE TYPE "TituloOrigen" AS ENUM ('VENTA_NUEVA', 'RENOVACION', 'BASE');

-- AlterTable
ALTER TABLE "padron_imports" ADD COLUMN     "clientesActualizados" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "cuotasSinCambios" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "esLineaBase" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "titulosActualizados" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "titulosNuevosRenovacion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "titulosNuevosVenta" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "titulos" ADD COLUMN     "cuotaInicial" INTEGER,
ADD COLUMN     "origen" "TituloOrigen" NOT NULL DEFAULT 'BASE';

-- Los titulos que ya estaban quedan como BASE, que es la verdad: entraron
-- antes de que el sistema supiera distinguir, y no hay forma de reconstruirlo.
-- `cuotaInicial` si se puede: es la cuota mas baja que se le conoce.
UPDATE "titulos" t
SET "cuotaInicial" = c."minCuota"
FROM (
  SELECT "tituloId", MIN("numeroCuota") AS "minCuota"
  FROM "titulo_cuotas"
  GROUP BY "tituloId"
) c
WHERE c."tituloId" = t."id";

-- La primera importacion de cada zona es la linea base de esa zona.
UPDATE "padron_imports"
SET "esLineaBase" = true
WHERE "id" IN (
  SELECT DISTINCT ON ("zonaId") "id"
  FROM "padron_imports"
  ORDER BY "zonaId", "createdAt" ASC
);
