-- DropIndex
DROP INDEX "vendedores_dni_key";

-- DropIndex
DROP INDEX "vendedores_userId_key";

-- CreateIndex
CREATE INDEX "vendedores_userId_idx" ON "vendedores"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "vendedores_zonaId_dni_key" ON "vendedores"("zonaId", "dni");

