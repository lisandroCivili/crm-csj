-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "telefono" TEXT;

-- AlterTable
ALTER TABLE "vendedores" ADD COLUMN     "puedeCargarVentas" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "puedeVerComision" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "puedeVerLeads" BOOLEAN NOT NULL DEFAULT true;
