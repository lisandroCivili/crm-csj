-- ACTIVIDAD: de log de leads a log de todo lo que pasa en la zona.
--
-- `lead_actividades` servia para una sola cosa: `leadId` obligatorio, la zona
-- derivada del lead y ningun vendedor propio. Para registrar tambien las ventas
-- y las correcciones de cliente hace falta lo contrario.
--
-- Esta migracion se escribe a mano a proposito. Prisma resolveria el renombre
-- como DROP + CREATE y con eso se perderia el historico de asignaciones y
-- cambios de estado que ya esta cargado, que es justamente lo que el admin usa
-- para ver que hicieron los vendedores.

-- 1. El enum ------------------------------------------------------------------
-- Se crea uno nuevo y se convierte la columna con un CAST, en vez de renombrar
-- los dos valores viejos y agregar los cinco que faltan: `ALTER TYPE ... ADD
-- VALUE` no se puede usar dentro de la misma transaccion que lo agrega, y las
-- migraciones de Prisma corren en una. El prefijo 'LEAD_' es exactamente lo que
-- convierte ASIGNACION y CAMBIO_ESTADO en sus nombres nuevos.
CREATE TYPE "ActividadTipo" AS ENUM ('LEAD_ASIGNACION', 'LEAD_CAMBIO_ESTADO', 'VENTA_ALTA', 'VENTA_EDICION', 'VENTA_ANULACION', 'VENTA_REACTIVACION', 'CLIENTE_EDICION');

ALTER TABLE "lead_actividades"
  ALTER COLUMN "tipo" TYPE "ActividadTipo"
  USING ('LEAD_' || "tipo"::text)::"ActividadTipo";

DROP TYPE "LeadActividadTipo";

-- 2. La tabla y todo lo que cuelga de su nombre --------------------------------
ALTER TABLE "lead_actividades" RENAME TO "actividades";
ALTER TABLE "actividades" RENAME CONSTRAINT "lead_actividades_pkey" TO "actividades_pkey";
ALTER TABLE "actividades" RENAME CONSTRAINT "lead_actividades_leadId_fkey" TO "actividades_leadId_fkey";
ALTER TABLE "actividades" RENAME CONSTRAINT "lead_actividades_actorUserId_fkey" TO "actividades_actorUserId_fkey";
ALTER INDEX "lead_actividades_leadId_idx" RENAME TO "actividades_leadId_idx";
-- El feed siempre filtra por zona, asi que el indice de createdAt solo lo
-- reemplaza el compuesto de mas abajo.
DROP INDEX "lead_actividades_createdAt_idx";

-- 3. Las columnas nuevas -------------------------------------------------------
-- `zonaId` entra nullable para poder rellenarla desde el lead antes de exigirla.
ALTER TABLE "actividades" ADD COLUMN "zonaId" INTEGER;
ALTER TABLE "actividades" ADD COLUMN "vendedorId" TEXT;
ALTER TABLE "actividades" ADD COLUMN "ventaId" TEXT;
ALTER TABLE "actividades" ADD COLUMN "clienteId" TEXT;
ALTER TABLE "actividades" ADD COLUMN "cambios" JSONB;

-- El historico se rellena desde el lead, que es de donde salia la zona hasta
-- ahora. `vendedorAsignadoId` puede ser NULL —un lead devuelto queda libre— y
-- esta bien que quede NULL: la actividad no se pierde, solo no la trae el
-- filtro por vendedor.
UPDATE "actividades" a
SET "zonaId" = l."zonaId",
    "vendedorId" = l."vendedorAsignadoId"
FROM "leads" l
WHERE l."id" = a."leadId";

ALTER TABLE "actividades" ALTER COLUMN "zonaId" SET NOT NULL;

-- Una actividad de venta o de cliente no tiene lead.
ALTER TABLE "actividades" ALTER COLUMN "leadId" DROP NOT NULL;

-- 4. Claves foraneas e indices -------------------------------------------------
ALTER TABLE "actividades" ADD CONSTRAINT "actividades_zonaId_fkey" FOREIGN KEY ("zonaId") REFERENCES "zonas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "actividades" ADD CONSTRAINT "actividades_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "vendedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "actividades" ADD CONSTRAINT "actividades_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "ventas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "actividades" ADD CONSTRAINT "actividades_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "actividades_zonaId_createdAt_idx" ON "actividades"("zonaId", "createdAt");
CREATE INDEX "actividades_vendedorId_createdAt_idx" ON "actividades"("vendedorId", "createdAt");
CREATE INDEX "actividades_ventaId_idx" ON "actividades"("ventaId");
CREATE INDEX "actividades_clienteId_idx" ON "actividades"("clienteId");
