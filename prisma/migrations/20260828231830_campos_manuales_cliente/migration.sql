-- AlterTable
ALTER TABLE "clientes" ADD COLUMN     "camposManuales" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "editadoAt" TIMESTAMP(3),
ADD COLUMN     "editadoPorUserId" TEXT;

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_editadoPorUserId_fkey" FOREIGN KEY ("editadoPorUserId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
