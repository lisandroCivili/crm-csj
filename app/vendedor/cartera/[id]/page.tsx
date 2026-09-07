import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Info, Phone } from "lucide-react";
import { BadgeCaidaTitulo } from "@/components/clientes/badge-caida";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { db } from "@/lib/db";
import { dia, diaDelPadron, pesos } from "@/lib/formato";
import type { TituloOrigen } from "@/lib/generated/prisma/client";
import { contradiceAlClub } from "@/lib/padron/caidas";
import { requirePermiso } from "@/lib/sesion";

const MES = new Intl.DateTimeFormat("es-AR", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

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

/**
 * La ficha de un titulo propio. El alcance va en la consulta —`vendedorId` y
 * `zonaId` junto al id—, que es como cargan las doce rutas `[id]` que ya
 * existen: un titulo ajeno no da 403, da 404, porque su existencia tampoco es
 * asunto de quien pregunta.
 *
 * No se ofrece corregir los datos del cliente: eso es del admin, y la pantalla
 * lo dice en vez de dejar al vendedor buscando el boton.
 */
export default async function FichaTituloPage({
  params,
}: PageProps<"/vendedor/cartera/[id]">) {
  const usuario = await requirePermiso("verCartera");
  const { id } = await params;

  const titulo = await db.titulo.findFirst({
    where: {
      id,
      vendedorId: usuario.vendedorId,
      ...(usuario.zonaIdFija === null ? {} : { zonaId: usuario.zonaIdFija }),
    },
    include: {
      cliente: true,
      cuotas: { orderBy: { numeroCuota: "desc" }, take: 36 },
      _count: { select: { cuotas: true } },
    },
  });

  if (!titulo) notFound();

  const desmentidoPorElClub = contradiceAlClub({
    cuotasPagas: titulo.cuotasPagas,
    cuotaMaxConocida: titulo.cuotaMaxConocida,
    impagasConsecutivas: titulo.impagasConsecutivas,
  });

  return (
    <>
      <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
        <Link href="/vendedor/cartera">
          <ArrowLeft className="size-4" />
          Mi cartera
        </Link>
      </Button>

      <PageHeader
        titulo={titulo.cliente.nombre}
        descripcion={`Título ${titulo.numTit} · DNI ${titulo.cliente.dni}`}
        acciones={
          titulo.cliente.telefono ? (
            <Button asChild>
              <a href={`tel:${titulo.cliente.telefono}`}>
                <Phone className="size-4" />
                Llamar
              </a>
            </Button>
          ) : null
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <BadgeCaidaTitulo titulo={titulo} />
        <Badge variant={titulo.origen === "BASE" ? "outline" : "secondary"}>
          {ORIGEN[titulo.origen]}
          {titulo.cuotaInicial ? ` · entró en la cuota ${titulo.cuotaInicial}` : ""}
        </Badge>
        {titulo.debitoAutomatico ? <Badge variant="secondary">débito automático</Badge> : null}
        {titulo.numSor ? <Badge variant="outline">Sorteo {titulo.numSor}</Badge> : null}
      </div>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base">Datos de contacto</CardTitle>
          <CardDescription>
            Vienen del último padrón. Si hay algo mal, avisale a Balta: los corrige él.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Dato
              etiqueta="Teléfono"
              valor={
                titulo.cliente.telefono ? (
                  <a href={`tel:${titulo.cliente.telefono}`} className="hover:underline">
                    {titulo.cliente.telefono}
                  </a>
                ) : null
              }
            />
            <Dato etiqueta="Domicilio" valor={titulo.cliente.domicilio} />
            <Dato etiqueta="Localidad" valor={titulo.cliente.localidad} />
            <Dato etiqueta="Código postal" valor={titulo.cliente.codPos} />
            <Dato etiqueta="Email" valor={titulo.cliente.email} />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cómo viene pagando</CardTitle>
          <CardDescription>
            El historial se arma con cada padrón que entra, así que sólo llega hasta donde
            llegan los padrones importados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-3 grid gap-4 sm:grid-cols-3">
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
              etiqueta="Cuotas pagas (según el club)"
              valor={titulo.cuotasPagas?.toLocaleString("es-AR")}
            />
            <Dato
              etiqueta="Histórico conocido"
              valor={
                titulo.cuotaMinConocida
                  ? `cuotas ${titulo.cuotaMinConocida} a ${titulo.cuotaMaxConocida}`
                  : null
              }
            />
            {titulo.caidoAt ? <Dato etiqueta="Caído desde" valor={dia(titulo.caidoAt)} /> : null}
          </div>

          {!titulo.caidaConfiable ? (
            <p className="mb-3 flex items-start gap-2 rounded-md border border-dashed p-3 text-xs text-muted-foreground">
              <Info className="mt-0.5 size-4 shrink-0" />
              <span>
                <strong className="font-medium">No alcanza para decir si está caído.</strong>{" "}
                Faltan cuotas entre las que conocemos, o la racha de impagas llega hasta el
                principio del historial. Una cuota que el sistema nunca vio pudo estar pagada,
                así que no se la cuenta como impaga.
              </span>
            </p>
          ) : null}

          {desmentidoPorElClub ? (
            <p className="mb-3 flex items-start gap-2 rounded-md border border-dashed p-3 text-xs text-muted-foreground">
              <Info className="mt-0.5 size-4 shrink-0" />
              <span>
                <strong className="font-medium">El club lo da al día.</strong> Informa{" "}
                {titulo.cuotasPagas} cuotas pagas, que cubren hasta la última que tenemos
                cargada. Lo que figura impago abajo probablemente se cobró después de emitido
                ese padrón: conviene mirarlo antes de llamar.
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {titulo.cuotas.map((cuota) => (
                  <TableRow key={cuota.id}>
                    <TableCell className="font-medium tabular-nums">
                      {cuota.numeroCuota}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {MES.format(cuota.periodoEmision)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {pesos(Number(cuota.importe))}
                    </TableCell>
                    <TableCell>
                      {cuota.fechaPago ? (
                        <span className="tabular-nums">{diaDelPadron(cuota.fechaPago)}</span>
                      ) : (
                        <Badge variant="outline" className="text-amber-700 dark:text-amber-500">
                          impaga
                        </Badge>
                      )}
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
    </>
  );
}
