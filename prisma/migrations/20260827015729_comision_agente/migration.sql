-- AlterTable
ALTER TABLE "zonas" ADD COLUMN     "objetivoContratosMensual" INTEGER NOT NULL DEFAULT 50;

-- CreateTable
CREATE TABLE "escalas_agente" (
    "id" TEXT NOT NULL,
    "zonaId" INTEGER NOT NULL,
    "cuotaDesde" INTEGER NOT NULL,
    "cuotaHasta" INTEGER,
    "porcentaje" DECIMAL(6,3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "escalas_agente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comision_agente_periodos" (
    "id" TEXT NOT NULL,
    "zonaId" INTEGER NOT NULL,
    "periodo" TEXT NOT NULL,
    "ventasNuevas" INTEGER NOT NULL DEFAULT 0,
    "renovaciones" INTEGER NOT NULL DEFAULT 0,
    "objetivoContratos" INTEGER NOT NULL DEFAULT 0,
    "cuotasCobradas" INTEGER NOT NULL DEFAULT 0,
    "baseCobrada" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "totalComision" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "gastosRepresentacion" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "estado" "ComisionEstado" NOT NULL DEFAULT 'BORRADOR',
    "fechaCierre" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comision_agente_periodos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comision_agente_detalles" (
    "id" TEXT NOT NULL,
    "periodoId" TEXT NOT NULL,
    "cuotaDesde" INTEGER NOT NULL,
    "cuotaHasta" INTEGER,
    "cantidadCuotas" INTEGER NOT NULL DEFAULT 0,
    "baseCalculo" DECIMAL(14,2) NOT NULL,
    "porcentajeAplicado" DECIMAL(6,3) NOT NULL,
    "monto" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comision_agente_detalles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "escalas_agente_zonaId_idx" ON "escalas_agente"("zonaId");

-- CreateIndex
CREATE UNIQUE INDEX "escalas_agente_zonaId_cuotaDesde_key" ON "escalas_agente"("zonaId", "cuotaDesde");

-- CreateIndex
CREATE UNIQUE INDEX "comision_agente_periodos_zonaId_periodo_key" ON "comision_agente_periodos"("zonaId", "periodo");

-- CreateIndex
CREATE INDEX "comision_agente_detalles_periodoId_idx" ON "comision_agente_detalles"("periodoId");

-- AddForeignKey
ALTER TABLE "escalas_agente" ADD CONSTRAINT "escalas_agente_zonaId_fkey" FOREIGN KEY ("zonaId") REFERENCES "zonas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comision_agente_periodos" ADD CONSTRAINT "comision_agente_periodos_zonaId_fkey" FOREIGN KEY ("zonaId") REFERENCES "zonas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comision_agente_detalles" ADD CONSTRAINT "comision_agente_detalles_periodoId_fkey" FOREIGN KEY ("periodoId") REFERENCES "comision_agente_periodos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Objetivo de contratos del mes, confirmado por Balta el 27/08/2026: Tucuman
-- 50 (el default de la columna) y Salta 100.
UPDATE "zonas" SET "objetivoContratosMensual" = 100 WHERE "nombre" = 'SALTA';

-- Escala del contrato de agencia vigente (adenda del 13/01/2023). Balta
-- confirmo que el contrato es el mismo para el y para Pedro, asi que se siembra
-- igual en las dos zonas. Queda editable desde /admin/comisiones/agente/escala:
-- esto es un punto de partida para que el sistema arranque liquidando, no un
-- porcentaje hardcodeado en el calculo.
INSERT INTO "escalas_agente" ("id", "zonaId", "cuotaDesde", "cuotaHasta", "porcentaje", "updatedAt")
SELECT gen_random_uuid()::text, z."id", t."desde", t."hasta", t."porcentaje", CURRENT_TIMESTAMP
FROM "zonas" z
CROSS JOIN (
  VALUES (1, 2, 25), (3, 4, 20), (5, 5, 10), (6, 60, 4), (61, NULL, 2)
) AS t("desde", "hasta", "porcentaje");
