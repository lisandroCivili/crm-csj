"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import {
  crearVenta,
  crearVentaComoAdmin,
  editarVenta,
  type EstadoVenta,
} from "@/app/vendedor/ventas/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PlanOpcion = {
  id: string;
  codigoProducto: string;
  nombre: string;
  precio: number | null;
};

type VendedorOpcion = {
  id: string;
  nombreCompleto: string;
  codigo: string;
};

type ValoresVenta = {
  id?: string;
  planId?: string | null;
  nroSuscripcion?: string | null;
  dni?: string;
  nombreCliente?: string;
  direccion?: string | null;
  telefono?: string | null;
  numeroTitulo?: string | null;
  observacion?: string | null;
};

const PESOS = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

function Campo({
  nombre,
  etiqueta,
  errores,
  requerido,
  ayuda,
  children,
}: {
  nombre: string;
  etiqueta: string;
  errores?: string[];
  requerido?: boolean;
  ayuda?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={nombre}>
        {etiqueta}
        {requerido ? <span className="text-destructive"> *</span> : null}
      </Label>
      {children}
      {ayuda && !errores?.length ? (
        <p className="text-xs text-muted-foreground">{ayuda}</p>
      ) : null}
      {errores?.length ? <p className="text-xs text-destructive">{errores[0]}</p> : null}
    </div>
  );
}

function BotonGuardar({ edicion }: { edicion: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Guardando…" : edicion ? "Guardar cambios" : "Cargar venta"}
    </Button>
  );
}

export function VentaForm({
  planes,
  valores,
  leadId,
  tieneDni,
  vendedores,
  vendedorPorDefecto,
}: {
  planes: PlanOpcion[];
  valores?: ValoresVenta;
  leadId?: string;
  tieneDni?: boolean;
  /**
   * Solo en el alta desde /admin. Su presencia es la que cambia el modo del
   * formulario: el vendedor carga siempre a su nombre y no elige nada.
   */
  vendedores?: VendedorOpcion[];
  vendedorPorDefecto?: string | null;
}) {
  const edicion = Boolean(valores?.id);
  const comoAdmin = vendedores !== undefined;

  // Tres campos se miran entre si mientras se escribe, asi que su valor vive en
  // el estado y no solo en el DOM:
  //
  //   - el plan elegido, para poder recordarle el precio al vendedor;
  //   - el titulo, que libera al numero de suscripcion de ser obligatorio;
  //   - el numero de suscripcion, que vuelve obligatoria la observacion.
  //
  // Esto es solo para que el asterisco y los avisos digan la verdad mientras se
  // carga. Las dos reglas se validan igual en el servidor (`ventaSchema`), que
  // es donde no se pueden esquivar.
  const [planId, setPlanId] = useState(valores?.planId ?? "");
  const [nroSuscripcion, setNroSuscripcion] = useState(valores?.nroSuscripcion ?? "");
  const [numeroTitulo, setNumeroTitulo] = useState(valores?.numeroTitulo ?? "");

  const planElegido = planes.find((plan) => plan.id === planId) ?? null;
  const suscripcionRequerida = numeroTitulo.trim() === "";
  const observacionRequerida = nroSuscripcion.trim() !== "";
  const [estado, accion] = useActionState<EstadoVenta, FormData>(
    edicion ? editarVenta : comoAdmin ? crearVentaComoAdmin : crearVenta,
    {}
  );
  const errores = estado.errores ?? {};

  return (
    <form action={accion} className="max-w-3xl space-y-4">
      {edicion ? <input type="hidden" name="id" value={valores?.id} /> : null}
      {leadId ? <input type="hidden" name="leadId" value={leadId} /> : null}

      {estado.error ? (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertDescription>{estado.error}</AlertDescription>
        </Alert>
      ) : null}

      {comoAdmin ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vendedor</CardTitle>
            <CardDescription>
              A nombre de quién queda la venta. La comisión se le va a liquidar a esta
              persona.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Campo
              nombre="vendedorId"
              etiqueta="Vendedor"
              requerido
              errores={errores.vendedorId}
            >
              <select
                id="vendedorId"
                name="vendedorId"
                defaultValue={vendedorPorDefecto ?? ""}
                required
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <option value="">— elegir vendedor —</option>
                {vendedores.map((vendedor) => (
                  <option key={vendedor.id} value={vendedor.id}>
                    {vendedor.nombreCompleto} · {vendedor.codigo}
                  </option>
                ))}
              </select>
            </Campo>
          </CardContent>
        </Card>
      ) : null}

      {/* El orden de los campos es el que definio Balta en el prototipo. Se
          respeta tal cual: es el orden en el que el vendedor tiene los datos
          adelante cuando carga la venta. */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Plan y suscripción</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {planes.length === 0 ? (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertDescription>
                No hay planes cargados. Pedile a Balta que suba la lista de precios.
              </AlertDescription>
            </Alert>
          ) : (
            <Campo nombre="planId" etiqueta="Plan" requerido errores={errores.planId}>
              <select
                id="planId"
                name="planId"
                value={planId}
                onChange={(evento) => setPlanId(evento.target.value)}
                required
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <option value="">— elegir plan —</option>
                {planes.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.nombre}
                  </option>
                ))}
              </select>
            </Campo>
          )}

          {/* El precio no se guarda con la venta ni se pregunta: es un
              recordatorio para el vendedor, que lo tiene que decir en voz alta
              mientras carga. El importe que vale es el que despues trae el
              padron. */}
          {planElegido ? (
            <p className="rounded-md bg-muted px-3 py-2 text-sm">
              {planElegido.precio ? (
                <>
                  Cuota de <strong className="font-semibold">{PESOS.format(planElegido.precio)}</strong>
                  {" "}· código {planElegido.codigoProducto}
                </>
              ) : (
                <>
                  Este plan todavía no tiene precio cargado · código{" "}
                  {planElegido.codigoProducto}
                </>
              )}
              <span className="ml-1 text-muted-foreground">
                (sólo como referencia, no se guarda)
              </span>
            </p>
          ) : null}

          <Campo
            nombre="nroSuscripcion"
            etiqueta="Nro Suscripción"
            requerido={suscripcionRequerida}
            errores={errores.nroSuscripcion}
            ayuda={
              suscripcionRequerida
                ? "Si el club ya asignó el título, cargá el título de abajo y este queda opcional."
                : "Opcional: ya cargaste el título."
            }
          >
            <Input
              id="nroSuscripcion"
              name="nroSuscripcion"
              inputMode="numeric"
              value={nroSuscripcion}
              onChange={(evento) => setNroSuscripcion(evento.target.value)}
            />
          </Campo>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos del cliente</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Campo
            nombre="dni"
            etiqueta="D.N.I"
            requerido
            errores={errores.dni}
            ayuda="Con esto se reconoce al cliente cuando aparezca en el padrón."
          >
            <Input
              id="dni"
              name="dni"
              inputMode="numeric"
              defaultValue={valores?.dni ?? ""}
              required
            />
          </Campo>

          <Campo
            nombre="nombreCliente"
            etiqueta="Nombre y Apellido"
            requerido
            errores={errores.nombreCliente}
          >
            <Input
              id="nombreCliente"
              name="nombreCliente"
              defaultValue={valores?.nombreCliente ?? ""}
              required
            />
          </Campo>

          <div className="sm:col-span-2">
            <Campo
              nombre="direccion"
              etiqueta="Calle Nro y Barrio"
              requerido
              errores={errores.direccion}
            >
              <Input
                id="direccion"
                name="direccion"
                defaultValue={valores?.direccion ?? ""}
                required
              />
            </Campo>
          </div>

          <Campo nombre="telefono" etiqueta="Teléfono" requerido errores={errores.telefono}>
            <Input
              id="telefono"
              name="telefono"
              inputMode="numeric"
              defaultValue={valores?.telefono ?? ""}
              required
            />
          </Campo>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Título y observación</CardTitle>
          <CardDescription>
            El título lo asigna el club. Mientras no lo tengas, la venta se identifica
            por el número de suscripción y hace falta una observación.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Campo nombre="numeroTitulo" etiqueta="Título" errores={errores.numeroTitulo}>
            <Input
              id="numeroTitulo"
              name="numeroTitulo"
              inputMode="numeric"
              value={numeroTitulo}
              onChange={(evento) => setNumeroTitulo(evento.target.value)}
            />
          </Campo>

          <Campo
            nombre="observacion"
            etiqueta="Observación"
            requerido={observacionRequerida}
            errores={errores.observacion}
            ayuda={
              observacionRequerida
                ? "Obligatoria mientras la venta no tenga título."
                : undefined
            }
          >
            <textarea
              id="observacion"
              name="observacion"
              rows={3}
              defaultValue={valores?.observacion ?? ""}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
          </Campo>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Documentación</CardTitle>
          <CardDescription>
            Imagen o PDF, hasta 10 MB. Se guardan de forma privada: solo los ve Balta y vos.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Campo
            nombre="adjuntoDni"
            etiqueta="Foto del DNI"
            errores={errores.adjuntoDni}
            ayuda={
              edicion
                ? tieneDni
                  ? "Ya hay una cargada. Subí otra solo si querés reemplazarla."
                  : "Esta venta todavía no tiene el DNI cargado."
                : "Opcional. Se puede subir después, editando la venta."
            }
          >
            <Input
              id="adjuntoDni"
              name="adjuntoDni"
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
            />
          </Campo>

          <Campo
            nombre="adjuntoContrato"
            etiqueta="Contrato"
            errores={errores.adjuntoContrato}
            ayuda="Opcional."
          >
            <Input
              id="adjuntoContrato"
              name="adjuntoContrato"
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
            />
          </Campo>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <BotonGuardar edicion={edicion} />
        <Button type="button" variant="ghost" asChild>
          <Link href={edicion ? `/vendedor/ventas/${valores?.id}` : "/vendedor/ventas"}>
            Cancelar
          </Link>
        </Button>
      </div>
    </form>
  );
}
