-- AlterTable
ALTER TABLE "ventas" ADD COLUMN     "anuladaAt" TIMESTAMP(3),
ADD COLUMN     "anuladaPorUserId" TEXT,
ADD COLUMN     "motivoAnulacion" TEXT;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_anuladaPorUserId_fkey" FOREIGN KEY ("anuladaPorUserId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
