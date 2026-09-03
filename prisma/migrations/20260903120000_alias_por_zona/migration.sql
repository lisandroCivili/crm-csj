-- Un NomVen pertenece a un solo vendedor DENTRO de una zona.
--
-- `nomVenPadron` era unico global, pero los tres lugares que lo usan filtran por
-- zona (`importarPadron`, `nomVenSinVincular` y la ficha del vendedor). Con Balta
-- y Pedro vendiendo en las dos, el alias quedaba tomado por la primera zona que
-- lo importara: la segunda lo veia "sin vincular", la importacion se cortaba, y
-- el createMany con skipDuplicates lo salteaba en silencio. La segunda zona no se
-- podia importar y no habia un solo mensaje de error que lo explicara.
--
-- Esta migracion se escribe a mano porque la columna es obligatoria y la tabla ya
-- tiene filas: hay que rellenarla desde el vendedor antes de ponerle el NOT NULL.
-- Prisma no puede generar eso solo.

-- 1. La columna, nullable por ahora.
ALTER TABLE "vendedores_alias" ADD COLUMN "zonaId" INTEGER;

-- 2. Backfill: la zona sale del vendedor al que el alias ya apunta.
UPDATE "vendedores_alias" a
SET "zonaId" = v."zonaId"
FROM "vendedores" v
WHERE v."id" = a."vendedorId";

-- 3. Recien ahora, obligatoria.
ALTER TABLE "vendedores_alias" ALTER COLUMN "zonaId" SET NOT NULL;

-- 4. El unico global se reemplaza por el unico por zona.
DROP INDEX "vendedores_alias_nomVenPadron_key";
CREATE UNIQUE INDEX "vendedores_alias_zonaId_nomVenPadron_key" ON "vendedores_alias"("zonaId", "nomVenPadron");

-- 5. La FK a la zona. RESTRICT y no CASCADE: borrar una zona con alias cargados
-- tiene que fallar, igual que en el resto del sistema.
ALTER TABLE "vendedores_alias" ADD CONSTRAINT "vendedores_alias_zonaId_fkey" FOREIGN KEY ("zonaId") REFERENCES "zonas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
