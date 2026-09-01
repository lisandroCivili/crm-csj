import Image from "next/image";
import Link from "next/link";
import { FileText, IdCard } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AdjuntoTipo } from "@/lib/generated/prisma/client";

const FECHA = new Intl.DateTimeFormat("es-AR");

const ETIQUETA: Record<AdjuntoTipo, string> = {
  DNI: "Foto del DNI",
  CONTRATO: "Contrato",
};

export type AdjuntoDeCliente = {
  id: string;
  tipo: AdjuntoTipo;
  mimeType: string;
  createdAt: Date;
  subidoPor: string;
  venta: { id: string; identificador: string };
};

/**
 * La documentacion que hay cargada de un cliente.
 *
 * El vinculo es **por DNI**, no por titulo: `Venta` no tiene FK a `Cliente`
 * —duplica el nombre y el DNI como texto— y `Venta.tituloId` existe en el
 * schema pero no lo escribe nadie, porque al cargar la venta ese titulo
 * todavia no llego en ningun padron. Se dice en pantalla para que nadie
 * suponga que faltan adjuntos cuando lo que falta es la venta cargada.
 *
 * Los archivos se sirven por `/api/uploads/[id]`, que valida sesion y zona:
 * son fotos de DNI y no pueden tener URL publica. Por eso las miniaturas van
 * con `unoptimized`, que el optimizador de Next no puede leer una ruta
 * autenticada.
 */
export function DocumentacionCliente({ adjuntos }: { adjuntos: AdjuntoDeCliente[] }) {
  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="text-base">Documentación</CardTitle>
        <CardDescription>
          Sale de las ventas cargadas con este DNI. Se abre con tu sesión: no hay link público
          a estos archivos.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {adjuntos.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay documentación cargada. Los adjuntos entran con la venta que carga el
            vendedor, y se buscan por DNI: si la venta se cargó con otro DNI, no aparece acá.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {adjuntos.map((adjunto) => {
              const url = `/api/uploads/${adjunto.id}`;
              const esImagen = adjunto.mimeType.startsWith("image/");

              return (
                <li key={adjunto.id} className="rounded-md border">
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 p-3 hover:bg-accent/50"
                  >
                    {esImagen ? (
                      <Image
                        src={url}
                        alt={ETIQUETA[adjunto.tipo]}
                        width={56}
                        height={56}
                        unoptimized
                        className="size-14 shrink-0 rounded object-cover"
                      />
                    ) : (
                      <span className="flex size-14 shrink-0 items-center justify-center rounded bg-muted">
                        {adjunto.tipo === "DNI" ? (
                          <IdCard className="size-6 text-muted-foreground" />
                        ) : (
                          <FileText className="size-6 text-muted-foreground" />
                        )}
                      </span>
                    )}
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">
                        {ETIQUETA[adjunto.tipo]}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {FECHA.format(adjunto.createdAt)} · {adjunto.subidoPor}
                      </span>
                    </span>
                  </a>
                  <p className="border-t px-3 py-2 text-xs text-muted-foreground">
                    <Link
                      href={`/admin/ventas/${adjunto.venta.id}`}
                      className="underline underline-offset-2"
                    >
                      Venta {adjunto.venta.identificador}
                    </Link>
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/** Como se nombra una venta cuando no hay nada mejor que mostrar. */
export function identificadorDeVenta(venta: {
  numeroTitulo: string | null;
  nroSuscripcion: string | null;
}): string {
  if (venta.numeroTitulo) return `título ${venta.numeroTitulo}`;
  if (venta.nroSuscripcion) return `suscripción ${venta.nroSuscripcion}`;
  return "sin identificar";
}
