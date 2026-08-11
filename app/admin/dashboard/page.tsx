import { ClipboardList, ScrollText, Users, UserSquare } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { requireAdmin, requireZonaActivaId } from "@/lib/sesion";

export default async function AdminDashboardPage() {
  const usuario = await requireAdmin();
  const zonaId = await requireZonaActivaId();

  const [leads, clientes, vendedores, ventas] = await Promise.all([
    db.lead.count({ where: { zonaId } }),
    db.cliente.count({ where: { zonaId } }),
    db.vendedor.count({ where: { zonaId, activo: true } }),
    db.venta.count({ where: { zonaId, estado: "ACTIVA" } }),
  ]);

  const tarjetas = [
    { etiqueta: "Leads", valor: leads, icono: ClipboardList },
    { etiqueta: "Clientes en padrón", valor: clientes, icono: Users },
    { etiqueta: "Vendedores activos", valor: vendedores, icono: UserSquare },
    { etiqueta: "Ventas", valor: ventas, icono: ScrollText },
  ];

  return (
    <>
      <PageHeader
        titulo={`Hola, ${usuario.nombre.split(" ")[0]}`}
        descripcion="Resumen de la zona activa."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tarjetas.map(({ etiqueta, valor, icono: Icono }) => (
          <Card key={etiqueta}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {etiqueta}
              </CardTitle>
              <Icono className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tabular-nums">
                {valor.toLocaleString("es-AR")}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="mt-6 text-sm text-muted-foreground">
        Los indicadores de cuotas, cobranzas y comisiones se agregan en la Fase 6.
      </p>
    </>
  );
}
