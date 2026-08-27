import { readdirSync } from "node:fs";
import { join } from "node:path";
import { notFound } from "next/navigation";
import { FlaskConical, Info, TriangleAlert } from "lucide-react";
import { HerramientasLaboratorio } from "@/components/laboratorio/herramientas-laboratorio";
import { PageHeader } from "@/components/layout/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { getZonaActiva, requireAdmin, requireZonaActivaId } from "@/lib/sesion";

const CARPETA_PADRONES = join("docs", "padrones-prueba");

/**
 * Banco de pruebas del entorno de desarrollo: vaciar el padron y volver a
 * cargarlo con datos ficticios controlables.
 *
 * La ruta no existe en produccion. Es la unica forma de que un descuido no
 * pueda borrar el padron real de Balta: no alcanza con esconder el item del
 * menu, porque la URL se puede escribir a mano.
 */
export default async function LaboratorioPage() {
  if (process.env.NODE_ENV === "production") notFound();

  await requireAdmin();
  const zonaId = await requireZonaActivaId();
  const zona = await getZonaActiva();

  const [clientes, titulos, cuotas, importaciones, vendedores, escalas, tramosAgente, ventas] =
    await Promise.all([
      db.cliente.count({ where: { zonaId } }),
      db.titulo.count({ where: { zonaId } }),
      db.tituloCuota.count({ where: { titulo: { zonaId } } }),
      db.padronImport.count({ where: { zonaId } }),
      db.vendedor.count({ where: { zonaId } }),
      db.escalaComision.count(),
      db.escalaAgente.count({ where: { zonaId } }),
      db.venta.count({ where: { zonaId } }),
    ]);

  let padrones: string[] = [];
  try {
    padrones = readdirSync(CARPETA_PADRONES)
      .filter((n) => n.endsWith(".xlsx") || n.endsWith(".xls"))
      .sort();
  } catch {
    // La carpeta se crea al generar los padrones; si no esta, se avisa abajo.
  }

  const nombreZona = zona?.nombre ?? "la zona activa";

  return (
    <>
      <PageHeader
        titulo="Laboratorio"
        descripcion="Herramientas para probar con datos ficticios. Solo existe en desarrollo."
      />

      <Alert variant="destructive" className="mb-5">
        <TriangleAlert />
        <AlertTitle>Estas herramientas borran datos y no se puede deshacer</AlertTitle>
        <AlertDescription>
          Esta pantalla no existe cuando la aplicación corre en producción: la ruta devuelve
          404. Aun así, conviene mirar los números de abajo antes de vaciar nada.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Qué hay cargado en {nombreZona}</CardTitle>
            <CardDescription>
              Lo que entra por el padrón se puede vaciar. Lo demás se conserva.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Se borra al vaciar
              </p>
              <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Dato etiqueta="Clientes" valor={clientes} />
                <Dato etiqueta="Títulos" valor={titulos} />
                <Dato etiqueta="Cuotas" valor={cuotas} />
                <Dato etiqueta="Importaciones" valor={importaciones} />
              </dl>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Se conserva
              </p>
              <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Dato etiqueta="Vendedores" valor={vendedores} />
                <Dato etiqueta="Ventas" valor={ventas} />
                <Dato etiqueta="Filas de escala" valor={escalas} />
                <Dato etiqueta="Tramos del contrato" valor={tramosAgente} />
              </dl>
            </div>

            <HerramientasLaboratorio zona={nombreZona} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Padrones de prueba</CardTitle>
            <CardDescription>
              Se importan en orden desde <strong>Padrón → Importar padrón</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {padrones.length === 0 ? (
              <Alert>
                <Info />
                <AlertDescription>
                  Todavía no están generados. Correr en una terminal:
                  <code className="mt-2 block rounded bg-muted px-2 py-1 text-xs">
                    npx tsx scripts/generar-padrones-prueba.ts
                  </code>
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <ol className="space-y-1.5 text-sm">
                  {padrones.map((nombre, i) => (
                    <li key={nombre} className="flex gap-2">
                      <span className="tabular-nums text-muted-foreground">{i + 1}.</span>
                      <code className="min-w-0 break-all text-xs">{nombre}</code>
                    </li>
                  ))}
                </ol>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Están en <code>{CARPETA_PADRONES}</code>. Cada uno trae 3 meses por título
                  y se solapa con el anterior, igual que los del club: por eso hay que
                  importarlos en orden.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Cómo empezar de cero</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed">
            <li>
              <strong>Vaciar el padrón</strong> de la zona con el botón de arriba.
            </li>
            <li>
              <strong>Crear los vendedores de prueba</strong>, también arriba. Deja sus
              nombres del padrón ya vinculados: sin eso la importación se planta, porque el
              sistema no importa un padrón con vendedores sin mapear.
            </li>
            <li>
              Ir a <strong>Padrón → Importar padrón</strong> e importar los archivos{" "}
              <strong>en orden</strong>, del 1 al {padrones.length || 7}. Cada uno se analiza
              antes de guardar, así que se puede ver qué va a hacer antes de confirmar.
            </li>
            <li>
              Si las comisiones dan cero, falta la escala: usar{" "}
              <strong>Cargar escala de ejemplo</strong>. Reemplaza los tramos de la escala
              predeterminada por una completa de c1 a c5, que es lo que hace falta para que
              se vea algo.
            </li>
            <li>
              La comisión del agente (<strong>Comisiones → Comisión del agente</strong>) usa su
              propia escala, la del contrato de agencia. Ya viene cargada; si se estuvo
              probando con otros porcentajes, <strong>Restaurar el contrato de agencia</strong>{" "}
              la deja como el contrato real.
            </li>
            <li>
              Revisar <strong>Clientes</strong>, <strong>Padrón</strong> y{" "}
              <strong>Comisiones</strong>.
            </li>
          </ol>
        </CardContent>
      </Card>

      <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        <FlaskConical className="size-3.5" />
        Los datos de prueba están marcados: títulos PT-*, DNI 9999*, vendedores PRUEBA-*.
      </p>
    </>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: number }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{etiqueta}</dt>
      <dd className="text-xl font-semibold tabular-nums">
        {valor.toLocaleString("es-AR")}
      </dd>
    </div>
  );
}
