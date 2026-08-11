-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'VENDEDOR');

-- CreateEnum
CREATE TYPE "ZonaNombre" AS ENUM ('SALTA', 'TUCUMAN');

-- CreateEnum
CREATE TYPE "LeadOrigen" AS ENUM ('CLUB', 'PROPIO');

-- CreateEnum
CREATE TYPE "LeadEstado" AS ENUM ('PENDIENTE', 'VENDIDO', 'NO_VENDIDO', 'DEVOLUCION');

-- CreateEnum
CREATE TYPE "LeadActividadTipo" AS ENUM ('ASIGNACION', 'CAMBIO_ESTADO');

-- CreateEnum
CREATE TYPE "VentaEstado" AS ENUM ('ACTIVA', 'ANULADA');

-- CreateEnum
CREATE TYPE "AdjuntoTipo" AS ENUM ('DNI', 'CONTRATO');

-- CreateEnum
CREATE TYPE "ComisionEstado" AS ENUM ('BORRADOR', 'CERRADO');

-- CreateTable
CREATE TABLE "zonas" (
    "id" SERIAL NOT NULL,
    "nombre" "ZonaNombre" NOT NULL,

    CONSTRAINT "zonas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendedores" (
    "id" TEXT NOT NULL,
    "nombreCompleto" TEXT NOT NULL,
    "dni" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "direccion" TEXT,
    "email" TEXT,
    "telefono" TEXT,
    "zonaId" INTEGER NOT NULL,
    "topeCuotasComision" INTEGER NOT NULL DEFAULT 4,
    "condiciones" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,

    CONSTRAINT "vendedores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendedores_alias" (
    "id" TEXT NOT NULL,
    "nomVenPadron" TEXT NOT NULL,
    "vendedorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendedores_alias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "padron_imports" (
    "id" TEXT NOT NULL,
    "archivoNombre" TEXT NOT NULL,
    "zonaId" INTEGER NOT NULL,
    "fechaEmisionArchivo" TIMESTAMP(3),
    "periodoDesde" TIMESTAMP(3),
    "periodoHasta" TIMESTAMP(3),
    "filasLeidas" INTEGER NOT NULL DEFAULT 0,
    "clientesNuevos" INTEGER NOT NULL DEFAULT 0,
    "titulosNuevos" INTEGER NOT NULL DEFAULT 0,
    "cuotasNuevas" INTEGER NOT NULL DEFAULT 0,
    "cuotasActualizadas" INTEGER NOT NULL DEFAULT 0,
    "cuotasReciePagadas" INTEGER NOT NULL DEFAULT 0,
    "importadoPorUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "padron_imports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" TEXT NOT NULL,
    "dni" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "domicilio" TEXT,
    "telefono" TEXT,
    "codPos" TEXT,
    "localidad" TEXT,
    "email" TEXT,
    "zonaId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "titulos" (
    "id" TEXT NOT NULL,
    "numTit" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "vendedorId" TEXT,
    "numSor" TEXT,
    "debitoAutomatico" BOOLEAN NOT NULL DEFAULT false,
    "codDistribucion" TEXT,
    "nomDistribucion" TEXT,
    "rescate" DECIMAL(14,2),
    "cuotasPagas" INTEGER,
    "zonaId" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "vistoEnPadronAt" TIMESTAMP(3),
    "ultimoPadronImportId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "titulos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "titulo_cuotas" (
    "id" TEXT NOT NULL,
    "tituloId" TEXT NOT NULL,
    "numeroCuota" INTEGER NOT NULL,
    "periodoEmision" TIMESTAMP(3) NOT NULL,
    "importe" DECIMAL(14,2) NOT NULL,
    "fechaPago" TIMESTAMP(3),
    "detalle" TEXT,
    "boni" TEXT,
    "anti" TEXT,
    "detectadaPagaAt" TIMESTAMP(3),
    "padronImportId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "titulo_cuotas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_imports" (
    "id" TEXT NOT NULL,
    "archivoNombre" TEXT NOT NULL,
    "origen" "LeadOrigen" NOT NULL,
    "zonaId" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL DEFAULT 0,
    "importadoPorUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_imports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT,
    "direccion" TEXT,
    "localidad" TEXT,
    "provincia" TEXT,
    "origen" "LeadOrigen" NOT NULL,
    "estado" "LeadEstado" NOT NULL DEFAULT 'PENDIENTE',
    "motivoDevolucion" TEXT,
    "vendedorAsignadoId" TEXT,
    "fechaAsignacion" TIMESTAMP(3),
    "zonaId" INTEGER NOT NULL,
    "leadImportId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_actividades" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "tipo" "LeadActividadTipo" NOT NULL,
    "estadoAnterior" "LeadEstado",
    "estadoNuevo" "LeadEstado",
    "detalle" TEXT,
    "actorUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_actividades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planes" (
    "id" TEXT NOT NULL,
    "codigoProducto" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "duracionMeses" INTEGER,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "planes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_precios" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "precio" DECIMAL(14,2) NOT NULL,
    "vigenteDesde" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plan_precios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ventas" (
    "id" TEXT NOT NULL,
    "leadId" TEXT,
    "vendedorId" TEXT NOT NULL,
    "zonaId" INTEGER NOT NULL,
    "nombreCliente" TEXT NOT NULL,
    "dni" TEXT NOT NULL,
    "direccion" TEXT,
    "localidad" TEXT,
    "provincia" TEXT,
    "telefono" TEXT,
    "planId" TEXT,
    "codigoProducto" TEXT,
    "debitoAutomatico" BOOLEAN NOT NULL DEFAULT false,
    "estado" "VentaEstado" NOT NULL DEFAULT 'ACTIVA',
    "fechaVenta" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tituloId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ventas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "venta_adjuntos" (
    "id" TEXT NOT NULL,
    "ventaId" TEXT NOT NULL,
    "tipo" "AdjuntoTipo" NOT NULL,
    "path" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "subidoPorUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "venta_adjuntos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "venta_historial" (
    "id" TEXT NOT NULL,
    "ventaId" TEXT NOT NULL,
    "cambios" JSONB NOT NULL,
    "modificadoPorUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "venta_historial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "escalas_comision" (
    "id" TEXT NOT NULL,
    "ventasMin" INTEGER NOT NULL,
    "ventasMax" INTEGER,
    "numeroCuota" INTEGER NOT NULL,
    "porcentaje" DECIMAL(6,3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "escalas_comision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comision_periodos" (
    "id" TEXT NOT NULL,
    "vendedorId" TEXT NOT NULL,
    "periodo" TEXT NOT NULL,
    "zonaId" INTEGER NOT NULL,
    "ventasAcumuladas" INTEGER NOT NULL DEFAULT 0,
    "totalComisionCuotas" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "gastosRepresentacion" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "totalComision" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "estado" "ComisionEstado" NOT NULL DEFAULT 'BORRADOR',
    "fechaCierre" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comision_periodos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comision_detalles" (
    "id" TEXT NOT NULL,
    "comisionPeriodoId" TEXT NOT NULL,
    "tituloCuotaId" TEXT,
    "ventaId" TEXT,
    "numeroCuota" INTEGER NOT NULL,
    "baseCalculo" DECIMAL(14,2) NOT NULL,
    "porcentajeAplicado" DECIMAL(6,3) NOT NULL,
    "monto" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comision_detalles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "zonas_nombre_key" ON "zonas"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "vendedores_dni_key" ON "vendedores"("dni");

-- CreateIndex
CREATE UNIQUE INDEX "vendedores_userId_key" ON "vendedores"("userId");

-- CreateIndex
CREATE INDEX "vendedores_zonaId_idx" ON "vendedores"("zonaId");

-- CreateIndex
CREATE UNIQUE INDEX "vendedores_zonaId_codigo_key" ON "vendedores"("zonaId", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "vendedores_alias_nomVenPadron_key" ON "vendedores_alias"("nomVenPadron");

-- CreateIndex
CREATE INDEX "vendedores_alias_vendedorId_idx" ON "vendedores_alias"("vendedorId");

-- CreateIndex
CREATE INDEX "padron_imports_zonaId_idx" ON "padron_imports"("zonaId");

-- CreateIndex
CREATE INDEX "clientes_zonaId_idx" ON "clientes"("zonaId");

-- CreateIndex
CREATE INDEX "clientes_nombre_idx" ON "clientes"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_zonaId_dni_key" ON "clientes"("zonaId", "dni");

-- CreateIndex
CREATE UNIQUE INDEX "titulos_numTit_key" ON "titulos"("numTit");

-- CreateIndex
CREATE INDEX "titulos_clienteId_idx" ON "titulos"("clienteId");

-- CreateIndex
CREATE INDEX "titulos_vendedorId_idx" ON "titulos"("vendedorId");

-- CreateIndex
CREATE INDEX "titulos_zonaId_idx" ON "titulos"("zonaId");

-- CreateIndex
CREATE INDEX "titulo_cuotas_periodoEmision_idx" ON "titulo_cuotas"("periodoEmision");

-- CreateIndex
CREATE INDEX "titulo_cuotas_fechaPago_idx" ON "titulo_cuotas"("fechaPago");

-- CreateIndex
CREATE INDEX "titulo_cuotas_detectadaPagaAt_idx" ON "titulo_cuotas"("detectadaPagaAt");

-- CreateIndex
CREATE UNIQUE INDEX "titulo_cuotas_tituloId_numeroCuota_key" ON "titulo_cuotas"("tituloId", "numeroCuota");

-- CreateIndex
CREATE INDEX "lead_imports_zonaId_idx" ON "lead_imports"("zonaId");

-- CreateIndex
CREATE INDEX "leads_zonaId_estado_idx" ON "leads"("zonaId", "estado");

-- CreateIndex
CREATE INDEX "leads_vendedorAsignadoId_idx" ON "leads"("vendedorAsignadoId");

-- CreateIndex
CREATE INDEX "lead_actividades_leadId_idx" ON "lead_actividades"("leadId");

-- CreateIndex
CREATE INDEX "lead_actividades_createdAt_idx" ON "lead_actividades"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "planes_codigoProducto_key" ON "planes"("codigoProducto");

-- CreateIndex
CREATE INDEX "plan_precios_planId_idx" ON "plan_precios"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "plan_precios_planId_vigenteDesde_key" ON "plan_precios"("planId", "vigenteDesde");

-- CreateIndex
CREATE INDEX "ventas_vendedorId_idx" ON "ventas"("vendedorId");

-- CreateIndex
CREATE INDEX "ventas_zonaId_idx" ON "ventas"("zonaId");

-- CreateIndex
CREATE INDEX "ventas_dni_idx" ON "ventas"("dni");

-- CreateIndex
CREATE INDEX "venta_adjuntos_ventaId_idx" ON "venta_adjuntos"("ventaId");

-- CreateIndex
CREATE INDEX "venta_historial_ventaId_idx" ON "venta_historial"("ventaId");

-- CreateIndex
CREATE UNIQUE INDEX "escalas_comision_ventasMin_numeroCuota_key" ON "escalas_comision"("ventasMin", "numeroCuota");

-- CreateIndex
CREATE INDEX "comision_periodos_zonaId_idx" ON "comision_periodos"("zonaId");

-- CreateIndex
CREATE UNIQUE INDEX "comision_periodos_vendedorId_periodo_key" ON "comision_periodos"("vendedorId", "periodo");

-- CreateIndex
CREATE INDEX "comision_detalles_comisionPeriodoId_idx" ON "comision_detalles"("comisionPeriodoId");

-- AddForeignKey
ALTER TABLE "vendedores" ADD CONSTRAINT "vendedores_zonaId_fkey" FOREIGN KEY ("zonaId") REFERENCES "zonas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendedores" ADD CONSTRAINT "vendedores_userId_fkey" FOREIGN KEY ("userId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendedores_alias" ADD CONSTRAINT "vendedores_alias_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "vendedores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "padron_imports" ADD CONSTRAINT "padron_imports_zonaId_fkey" FOREIGN KEY ("zonaId") REFERENCES "zonas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "padron_imports" ADD CONSTRAINT "padron_imports_importadoPorUserId_fkey" FOREIGN KEY ("importadoPorUserId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_zonaId_fkey" FOREIGN KEY ("zonaId") REFERENCES "zonas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "titulos" ADD CONSTRAINT "titulos_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "titulos" ADD CONSTRAINT "titulos_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "vendedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "titulos" ADD CONSTRAINT "titulos_zonaId_fkey" FOREIGN KEY ("zonaId") REFERENCES "zonas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "titulos" ADD CONSTRAINT "titulos_ultimoPadronImportId_fkey" FOREIGN KEY ("ultimoPadronImportId") REFERENCES "padron_imports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "titulo_cuotas" ADD CONSTRAINT "titulo_cuotas_tituloId_fkey" FOREIGN KEY ("tituloId") REFERENCES "titulos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "titulo_cuotas" ADD CONSTRAINT "titulo_cuotas_padronImportId_fkey" FOREIGN KEY ("padronImportId") REFERENCES "padron_imports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_imports" ADD CONSTRAINT "lead_imports_zonaId_fkey" FOREIGN KEY ("zonaId") REFERENCES "zonas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_imports" ADD CONSTRAINT "lead_imports_importadoPorUserId_fkey" FOREIGN KEY ("importadoPorUserId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_vendedorAsignadoId_fkey" FOREIGN KEY ("vendedorAsignadoId") REFERENCES "vendedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_zonaId_fkey" FOREIGN KEY ("zonaId") REFERENCES "zonas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_leadImportId_fkey" FOREIGN KEY ("leadImportId") REFERENCES "lead_imports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_actividades" ADD CONSTRAINT "lead_actividades_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_actividades" ADD CONSTRAINT "lead_actividades_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_precios" ADD CONSTRAINT "plan_precios_planId_fkey" FOREIGN KEY ("planId") REFERENCES "planes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "vendedores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_zonaId_fkey" FOREIGN KEY ("zonaId") REFERENCES "zonas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_planId_fkey" FOREIGN KEY ("planId") REFERENCES "planes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_tituloId_fkey" FOREIGN KEY ("tituloId") REFERENCES "titulos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venta_adjuntos" ADD CONSTRAINT "venta_adjuntos_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "ventas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venta_adjuntos" ADD CONSTRAINT "venta_adjuntos_subidoPorUserId_fkey" FOREIGN KEY ("subidoPorUserId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venta_historial" ADD CONSTRAINT "venta_historial_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "ventas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venta_historial" ADD CONSTRAINT "venta_historial_modificadoPorUserId_fkey" FOREIGN KEY ("modificadoPorUserId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comision_periodos" ADD CONSTRAINT "comision_periodos_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "vendedores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comision_periodos" ADD CONSTRAINT "comision_periodos_zonaId_fkey" FOREIGN KEY ("zonaId") REFERENCES "zonas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comision_detalles" ADD CONSTRAINT "comision_detalles_comisionPeriodoId_fkey" FOREIGN KEY ("comisionPeriodoId") REFERENCES "comision_periodos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comision_detalles" ADD CONSTRAINT "comision_detalles_tituloCuotaId_fkey" FOREIGN KEY ("tituloCuotaId") REFERENCES "titulo_cuotas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comision_detalles" ADD CONSTRAINT "comision_detalles_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "ventas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
