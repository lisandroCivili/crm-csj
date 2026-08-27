import Link from "next/link";
import { ArrowLeft, Info, Target, TriangleAlert } from "lucide-react";
import { EditorEscalaAgente } from "@/components/comisiones/editor-escala-agente";
import { ObjetivoContratos } from "@/components/comisiones/objetivo-contratos";
import { PageHeader } from "@/components/layout/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { revisarEscalaAgente } from "@/lib/comisiones/calcularComisionAgente";
import { listarEscalaAgente } from "@/lib/comisiones/liquidacionAgente";
import { db } from "@/lib/db";
import { requireAdmin, requireZonaActivaId } from "@/lib/sesion";

export default async function EscalaAgentePage() {
  await requireAdmin();
  const zonaId = await requireZonaActivaId();

  const [zona, tramos] = await Promise.all([
    db.zona.findUniqueOrThrow({
      where: { id: zonaId },
      select: { nombre: true, objetivoContratosMensual: true },
    }),
    listarEscalaAgente(zonaId),
  ]);

  const avisos = revisarEscalaAgente(tramos);

  return (
    <>
      <PageHeader
        titulo="Contrato de agencia"
        descripcion={`Lo que el club le paga a la agencia por cada cuota cobrada en ${zona.nombre}.`}
        acciones={
          <Button variant="outline" asChild>
            <Link href="/admin/comisiones/agente">
              <ArrowLeft className="size-4" />
              Volver
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Tramos por número de cuota</CardTitle>
            <CardDescription>
              Un solo eje: el número de cuota decide el porcentaje. Cuánto se vendió ese mes no
              lo mueve.
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
                No hay ningún tramo cargado, así que la comisión del agente liquida en cero.
                Empezá por la cuota 1 y dejá el último tramo sin techo.
              </p>
            ) : null}

            <EditorEscalaAgente tramos={tramos} />
          </CardContent>
        </Card>

        <div className="grid content-start gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="size-4 text-muted-foreground" />
                Objetivo del mes
              </CardTitle>
              <CardDescription>
                Contratos que el contrato de agencia pide en {zona.nombre}.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ObjetivoContratos valor={zona.objetivoContratosMensual} />
              <p className="text-xs leading-relaxed text-muted-foreground">
                Cuentan las ventas nuevas y las renovaciones. Si el mes no llega, la
                liquidación lo avisa pero calcula igual: falta definir a qué esquema vuelve el
                club cuando no se alcanza.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cómo se usa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-relaxed text-muted-foreground">
              <p>
                Cada cuota que el padrón muestra cobrada en el mes cae en el tramo de su
                número, y se le aplica ese porcentaje sobre el importe cobrado.
              </p>
              <p>
                Entran{" "}
                <strong className="font-medium text-foreground">todas las cuotas de la zona</strong>
                , de cualquier vendedor, y{" "}
                <strong className="font-medium text-foreground">sin tope de cuota 5</strong>: ese
                tope es el del vendedor, no el del contrato con el club.
              </p>

              <Alert>
                <Info />
                <AlertDescription>
                  Dejá el último tramo sin techo. Los planes llegan a la cuota 300 y la mayor
                  parte del volumen del padrón son cuotas altas.
                </AlertDescription>
              </Alert>

              <p className="text-xs">
                Cambiar un porcentaje no toca los períodos ya cerrados: al cerrar queda
                congelado en la liquidación.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
