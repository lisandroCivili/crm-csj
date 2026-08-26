-- Escalas de comision por vendedor (Fase 1 del plan de trabajo).
--
-- Antes habia una sola escala global. Ahora `Escala` es una tabla cabecera y
-- `EscalaComision` cuelga de una escala puntual. Los tramos que ya estaban
-- cargados no pueden perderse ni quedar huerfanos, asi que esta migracion:
--
--   1. Crea la tabla `escalas`.
--   2. Crea la escala "General" y la marca predeterminada: es la que se le
--      aplica a un vendedor sin `escalaId` propio (ver Vendedor.escala en el
--      schema).
--   3. Le imputa a "General" todos los tramos que ya existian en
--      `escalas_comision`, antes de exigir que la columna sea NOT NULL.
--
-- El `escalaId` va en una tabla cabecera aparte y no como `vendedorId`
-- nullable en `EscalaComision` a proposito: en Postgres cada NULL es distinto
-- y la clave unica no impediria escalas duplicadas.

-- CreateTable
CREATE TABLE "escalas" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "esPredeterminada" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "escalas_pkey" PRIMARY KEY ("id")
);

-- Escala por defecto para los tramos que ya estaban cargados.
INSERT INTO "escalas" ("id", "nombre", "esPredeterminada", "createdAt", "updatedAt")
VALUES ('escala_general_migracion', 'General', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- AlterTable: primero nullable para poder rellenar, despues NOT NULL.
ALTER TABLE "escalas_comision" ADD COLUMN "escalaId" TEXT;

UPDATE "escalas_comision" SET "escalaId" = 'escala_general_migracion';

ALTER TABLE "escalas_comision" ALTER COLUMN "escalaId" SET NOT NULL;

-- DropIndex
DROP INDEX "escalas_comision_ventasMin_numeroCuota_key";

-- CreateIndex
CREATE INDEX "escalas_comision_escalaId_idx" ON "escalas_comision"("escalaId");

-- CreateIndex
CREATE UNIQUE INDEX "escalas_comision_escalaId_ventasMin_numeroCuota_key" ON "escalas_comision"("escalaId", "ventasMin", "numeroCuota");

-- AddForeignKey
ALTER TABLE "escalas_comision" ADD CONSTRAINT "escalas_comision_escalaId_fkey" FOREIGN KEY ("escalaId") REFERENCES "escalas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "vendedores" ADD COLUMN "escalaId" TEXT;

-- CreateIndex
CREATE INDEX "vendedores_escalaId_idx" ON "vendedores"("escalaId");

-- AddForeignKey
ALTER TABLE "vendedores" ADD CONSTRAINT "vendedores_escalaId_fkey" FOREIGN KEY ("escalaId") REFERENCES "escalas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
