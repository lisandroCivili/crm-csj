-- Un ComisionDetalle es un renglon agrupado (todas las cuotas del mismo numero
-- cobradas en el periodo), asi que necesita guardar cuantas cuotas entraron.
ALTER TABLE "comision_detalles" ADD COLUMN "cantidadCuotas" INTEGER NOT NULL DEFAULT 0;

-- El tramo de escala se define por mes, no por acumulado historico: el nombre
-- viejo describia mal el dato. Se renombra en vez de recrear la columna para no
-- perder lo que ya estuviera cargado.
ALTER TABLE "comision_periodos" RENAME COLUMN "ventasAcumuladas" TO "ventasDelPeriodo";
