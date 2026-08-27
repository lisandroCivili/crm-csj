-- Estado de caida de cada titulo. Es un derivado del historico de cuotas, asi
-- que aca no se calcula nada: los defaults dejan a todos los titulos como "sin
-- datos suficientes" (caidaConfiable = false), que es la verdad hasta que se
-- corra la primera pasada con scripts/recalcular-caidas.ts. De ahi en adelante
-- lo mantiene al dia cada importacion de padron.
--
-- La regla vive en lib/padron/caidas.ts, con tests. Rehacerla en SQL seria un
-- segundo lugar donde puede estar mal, y la parte dificil —distinguir "no pago"
-- de "no lo vimos"— es justamente la que no se puede escribir dos veces.

-- AlterTable
ALTER TABLE "titulos" ADD COLUMN     "caidaConfiable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "caidoAt" TIMESTAMP(3),
ADD COLUMN     "cuotaMaxConocida" INTEGER,
ADD COLUMN     "cuotaMinConocida" INTEGER,
ADD COLUMN     "cuotaUltimaPaga" INTEGER,
ADD COLUMN     "impagasConsecutivas" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "titulos_zonaId_caidoAt_idx" ON "titulos"("zonaId", "caidoAt");
