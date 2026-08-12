import Link from "next/link";
import { ArrowLeft, Info, TriangleAlert } from "lucide-react";
import { EditorEscalas } from "@/components/comisiones/editor-escalas";
import { PageHeader } from "@/components/layout/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { agruparEnTramos, revisarEscala } from "@/lib/comisiones/escalas";
import { listarEscalas } from "@/lib/comisiones/liquidacion";
import { requireAdmin } from "@/lib/sesion";

export default async function EscalasPage() {
  await requireAdmin();

  const tramos = agruparEnTramos(await listarEscalas());
  const avisos = revisarEscala(tramos);

  return (
    <>
      <PageHeader
        titulo="Escalas de comisión"
        descripcion="El porcentaje que cobra cada cuota según cuántas ventas nuevas hizo el vendedor ese mes."
        acciones={
          <Button variant="outline" asChild>
            <Link href="/admin/comisiones">
              <ArrowLeft className="size-4" />
              Volver a la liquidación
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Tramos</CardTitle>
            <CardDescription>
              Cada fila es un tramo de ventas nuevas del mes. Dentro del tramo, cada cuota
              tiene su propio porcentaje.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {avisos.length > 0 ? (
              <Alert className="mb-5">
                <TriangleAlert />
                <AlertTitle>Revisá la escala</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc space-y-1 pl-4">
                    {avisos.map((aviso) => (
                      <li key={aviso}>{aviso}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            ) : null}

            {tramos.length === 0 ? (
              <p className="mb-4 text-sm text-muted-foreground">
                Todavía no hay ninguna escala cargada, así que la liquidación no paga nada.
                Empezá por el tramo que arranca en 0 y dejá el techo del último vacío para
                que cubra de ahí en adelante.
              </p>
            ) : null}

            <EditorEscalas tramos={tramos} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cómo se usa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-relaxed text-muted-foreground">
            <p>
              Al liquidar un mes, el sistema cuenta las{" "}
              <strong className="font-medium text-foreground">ventas nuevas</strong> del
              vendedor —las cuotas 1 que el padrón muestra cobradas— y con ese número elige
              el tramo.
            </p>
            <p>
              Después agrupa el resto de lo cobrado por número de cuota y le aplica el
              porcentaje de ese tramo. La cuota 1 suele ser la de mayor comisión.
            </p>
            <p>
              El tramo se mide{" "}
              <strong className="font-medium text-foreground">mes a mes</strong>, no por
              acumulado histórico: un mes flojo no arrastra al siguiente.
            </p>

            <Alert>
              <Info />
              <AlertDescription>
                Dejá siempre un tramo que arranque en 0: es el que cobra el vendedor que no
                vendió nada ese mes pero sí cobró cuotas viejas.
              </AlertDescription>
            </Alert>

            <p className="text-xs">
              Cambiar un porcentaje no toca los períodos ya cerrados: al cerrar, el
              porcentaje queda congelado en la liquidación.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
