import { ClipboardList, ScrollText } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { requireVendedor } from "@/lib/sesion";

export default async function VendedorDashboardPage() {
  const usuario = await requireVendedor();

  const [leadsPendientes, ventas] = await Promise.all([
    db.lead.count({
      where: { vendedorAsignadoId: usuario.vendedorId, estado: "PENDIENTE" },
    }),
    db.venta.count({ where: { vendedorId: usuario.vendedorId, estado: "ACTIVA" } }),
  ]);

  const tarjetas = [
    { etiqueta: "Leads pendientes", valor: leadsPendientes, icono: ClipboardList },
    { etiqueta: "Mis ventas", valor: ventas, icono: ScrollText },
  ];

  return (
    <>
      <PageHeader
        titulo={`Hola, ${usuario.nombre.split(" ")[0]}`}
        descripcion="Resumen de tu actividad."
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
        Las cuotas cobradas, la comisión y el cierre del mes se agregan en la Fase 6.
      </p>
    </>
  );
}
