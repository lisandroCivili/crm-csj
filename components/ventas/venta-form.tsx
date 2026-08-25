"use client";

import { useActionState } from "react";
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
  nombreCliente?: string;
  dni?: string;
  telefono?: string | null;
  direccion?: string | null;
  localidad?: string | null;
  provincia?: string | null;
  planId?: string | null;
  debitoAutomatico?: boolean;
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos del cliente</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Campo
              nombre="nombreCliente"
              etiqueta="Nombre y apellido"
              requerido
              errores={errores.nombreCliente}
            >
              <Input
                id="nombreCliente"
                name="nombreCliente"
                defaultValue={valores?.nombreCliente ?? ""}
                required
                autoFocus
              />
            </Campo>
          </div>

          <Campo
            nombre="dni"
            etiqueta="DNI"
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

          <Campo nombre="telefono" etiqueta="Teléfono" requerido errores={errores.telefono}>
            <Input
              id="telefono"
              name="telefono"
              defaultValue={valores?.telefono ?? ""}
              required
            />
          </Campo>

          <div className="sm:col-span-2">
            <Campo nombre="direccion" etiqueta="Dirección" errores={errores.direccion}>
              <Input id="direccion" name="direccion" defaultValue={valores?.direccion ?? ""} />
            </Campo>
          </div>

          <Campo nombre="localidad" etiqueta="Localidad" errores={errores.localidad}>
            <Input id="localidad" name="localidad" defaultValue={valores?.localidad ?? ""} />
          </Campo>

          <Campo nombre="provincia" etiqueta="Provincia" errores={errores.provincia}>
            <Input id="provincia" name="provincia" defaultValue={valores?.provincia ?? ""} />
          </Campo>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Plan</CardTitle>
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
            <Campo nombre="planId" etiqueta="Producto" requerido errores={errores.planId}>
              <select
                id="planId"
                name="planId"
                defaultValue={valores?.planId ?? ""}
                required
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <option value="">— elegir plan —</option>
                {planes.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.codigoProducto} · {plan.nombre}
                    {plan.precio ? ` · ${PESOS.format(plan.precio)}` : ""}
                  </option>
                ))}
              </select>
            </Campo>
          )}

          <label className="flex cursor-pointer items-center gap-3 rounded-md border p-3">
            <input
              type="checkbox"
              name="debitoAutomatico"
              defaultChecked={valores?.debitoAutomatico ?? false}
            />
            <span className="text-sm">Adhiere a débito automático</span>
          </label>
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
            requerido={!edicion}
            errores={errores.adjuntoDni}
            ayuda={
              edicion
                ? tieneDni
                  ? "Ya hay una cargada. Subí otra solo si querés reemplazarla."
                  : "Esta venta todavía no tiene el DNI cargado."
                : undefined
            }
          >
            <Input
              id="adjuntoDni"
              name="adjuntoDni"
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              required={!edicion}
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
