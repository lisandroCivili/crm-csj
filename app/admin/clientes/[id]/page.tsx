import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Info } from "lucide-react";
import { BadgeCaidaTitulo } from "@/components/clientes/badge-caida";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { db } from "@/lib/db";
import type { TituloOrigen } from "@/lib/generated/prisma/client";
import { contradiceAlClub } from "@/lib/padron/caidas";
import { requireAdmin, requireZonaActivaId } from "@/lib/sesion";

const PESOS = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});
const MES = new Intl.DateTimeFormat("es-AR", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const FECHA = new Intl.DateTimeFormat("es-AR", { timeZone: "UTC" });

/**
 * Como entro el titulo al sistema. `BASE` es el que ya venia cuando se importo
 * el primer padron de la zona: no se puede saber si fue venta o renovacion.
 */
const ORIGEN: Record<TituloOrigen, string> = {
  VENTA_NUEVA: "venta nueva",
  RENOVACION: "renovación",
  BASE: "ya venía del padrón",
};

function Dato({ etiqueta, valor }: { etiqueta: string; valor: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{etiqueta}</dt>
      <dd className="mt-0.5 text-sm">
        {valor || <span className="text-muted-foreground">—</span>}
      </dd>
    </div>
  );
}

export default async function FichaClientePage({
  params,
}: PageProps<"/admin/clientes/[id]">) {
  await requireAdmin();
  const zonaId = await requireZonaActivaId();
  const { id } = await params;

  const cliente = await db.cliente.findFirst({
    where: { id, zonaId },
    include: {
      titulos: {
        orderBy: { numTit: "asc" },
        include: {
          vendedor: { select: { id: true, nombreCompleto: true } },
          cuotas: { orderBy: { numeroCuota: "desc" }, take: 36 },
          _count: { select: { cuotas: true } },
        },
      },
    },
  });

  if (!cliente) notFound();

  return (
    <>
      <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
        <Link href="/admin/clientes">
          <ArrowLeft className="size-4" />
          Clientes
        </Link>
      </Button>

      <PageHeader
        titulo={cliente.nombre}
        descripcion={`DNI ${cliente.dni} · ${cliente.titulos.length} título${
          cliente.titulos.length === 1 ? "" : "s"
        }`}
      />

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base">Datos de contacto</CardTitle>
          <CardDescription>Vienen del último padrón importado.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Dato etiqueta="Domicilio" valor={cliente.domicilio} />
            <Dato etiqueta="Localidad" valor={cliente.localidad} />
            <Dato etiqueta="Código postal" valor={cliente.codPos} />
            <Dato etiqueta="Teléfono" valor={cliente.telefono} />
            <Dato etiqueta="Email" valor={cliente.email} />
          </dl>
        </CardContent>
      </Card>

      {cliente.titulos.map((titulo) => {
        // El club manda cuantas cuotas lleva pagas; si ese numero llega hasta
        // la ultima que conocemos, lo esta dando al dia y lo que vemos impago
        // seguramente se pago despues de emitido el padron.
        const desmentidoPorElClub = contradiceAlClub({
          cuotasPagas: titulo.cuotasPagas,
          cuotaMaxConocida: titulo.cuotaMaxConocida,
          impagasConsecutivas: titulo.impagasConsecutivas,
        });

        return (
          <Card key={titulo.id} className="mb-4">
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base">Título {titulo.numTit}</CardTitle>
                  <CardDescription>
                    {titulo.vendedor ? (
                      <>
                        Vendedor:{" "}
                        <Link
                          href={`/admin/vendedores/${titulo.vendedor.id}`}
                          className="underline underline-offset-2"
                        >
                          {titulo.vendedor.nombreCompleto}
                        </Link>
                      </>
                    ) : (
                      "Sin vendedor asignado"
                    )}
                    {titulo.numSor ? ` · Sorteo ${titulo.numSor}` : ""}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <BadgeCaidaTitulo titulo={titulo} />
                  <Badge variant={titulo.origen === "BASE" ? "outline" : "secondary"}>
                    {ORIGEN[titulo.origen]}
                    {titulo.cuotaInicial ? ` · entró en la cuota ${titulo.cuotaInicial}` : ""}
                  </Badge>
                  {titulo.debitoAutomatico ? (
                    <Badge variant="secondary">débito automático</Badge>
                  ) : null}
                  {titulo.nomDistribucion ? (
                    <Badge variant="outline">{titulo.nomDistribucion}</Badge>
                  ) : null}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-3 grid gap-4 sm:grid-cols-3">
                <Dato
                  etiqueta="Cuotas registradas"
                  valor={titulo._count.cuotas.toLocaleString("es-AR")}
                />
                <Dato
                  etiqueta="Cuotas pagas (según el club)"
                  valor={titulo.cuotasPagas?.toLocaleString("es-AR")}
                />
                <Dato
                  etiqueta="Rescate"
                  valor={titulo.rescate ? PESOS.format(Number(titulo.rescate)) : null}
                />
                <Dato
                  etiqueta="Última cuota paga"
                  valor={
                    titulo.cuotaUltimaPaga ? (
                      `cuota ${titulo.cuotaUltimaPaga}`
                    ) : (
                      <span className="text-muted-foreground">ninguna que hayamos visto</span>
                    )
                  }
                />
                <Dato
                  etiqueta="Histórico conocido"
                  valor={
                    titulo.cuotaMinConocida
                      ? `cuotas ${titulo.cuotaMinConocida} a ${titulo.cuotaMaxConocida}`
                      : null
                  }
                />
                {titulo.caidoAt ? (
                  <Dato etiqueta="Caído desde" valor={FECHA.format(titulo.caidoAt)} />
                ) : null}
              </div>

              {!titulo.caidaConfiable ? (
                <p className="mb-3 flex items-start gap-2 rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                  <Info className="mt-0.5 size-4 shrink-0" />
                  <span>
                    <strong className="font-medium">No alcanza para decir si está caído.</strong>{" "}
                    Faltan cuotas entre las que conocemos, o la racha de impagas llega hasta el
                    principio del historial. Una cuota que el sistema nunca vio pudo estar
                    pagada, así que no se la cuenta como impaga. Se resuelve importando los
                    padrones que faltan.
                  </span>
                </p>
              ) : null}

              {desmentidoPorElClub ? (
                <p className="mb-3 flex items-start gap-2 rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                  <Info className="mt-0.5 size-4 shrink-0" />
                  <span>
                    <strong className="font-medium">El club lo da al día.</strong> Informa{" "}
                    {titulo.cuotasPagas} cuotas pagas, que cubren hasta la última que tenemos
                    cargada. Lo que figura impago abajo probablemente se cobró después de
                    emitido ese padrón.
                  </span>
                </p>
              ) : null}

              <div className="max-h-96 overflow-y-auto rounded-md border">
                <Table>
                  <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                      <TableHead className="w-20">Cuota</TableHead>
                      <TableHead>Emisión</TableHead>
                      <TableHead className="text-right">Importe</TableHead>
                      <TableHead>Pago</TableHead>
                      <TableHead>Detalle</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {titulo.cuotas.map((cuota) => (
                      <TableRow key={cuota.id}>
                        <TableCell className="tabular-nums font-medium">
                          {cuota.numeroCuota}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {MES.format(cuota.periodoEmision)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {PESOS.format(Number(cuota.importe))}
                        </TableCell>
                        <TableCell>
                          {cuota.fechaPago ? (
                            <span className="tabular-nums">{FECHA.format(cuota.fechaPago)}</span>
                          ) : (
                            <Badge variant="outline" className="text-amber-700 dark:text-amber-500">
                              impaga
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="max-w-56 truncate text-xs text-muted-foreground">
                          {cuota.detalle ?? ""}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {titulo._count.cuotas > titulo.cuotas.length ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Se muestran las {titulo.cuotas.length} cuotas más recientes de{" "}
                  {titulo._count.cuotas}.
                </p>
              ) : null}
            </CardContent>
          </Card>
        );
      })}
    </>
  );
}
