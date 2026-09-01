"use client";

import { useActionState, useId, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import {
  crearVenta,
  crearVentaComoAdmin,
  editarVenta,
  editarVentaComoAdmin,
  type EstadoVenta,
} from "@/app/vendedor/ventas/actions";
import { CampoFoto } from "@/components/ventas/campo-foto";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

/** Lo que se muestra en el cuadro de confirmación, ya legible. */
type Resumen = { etiqueta: string; valor: string }[];

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

function BotonGuardar({ formId, etiqueta }: { formId: string; etiqueta: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" form={formId} disabled={pending}>
      {pending ? "Guardando…" : etiqueta}
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
  admin,
}: {
  planes: PlanOpcion[];
  valores?: ValoresVenta;
  leadId?: string;
  tieneDni?: boolean;
  /**
   * Solo en el alta desde /admin: el vendedor carga siempre a su nombre y no
   * elige nada.
   */
  vendedores?: VendedorOpcion[];
  vendedorPorDefecto?: string | null;
  /** Desde qué panel se está usando. Decide la acción y adónde se vuelve. */
  admin?: boolean;
}) {
  const edicion = Boolean(valores?.id);
  const eligeVendedor = vendedores !== undefined;
  const base = admin ? "/admin/ventas" : "/vendedor/ventas";

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
    edicion
      ? admin
        ? editarVentaComoAdmin
        : editarVenta
      : admin
        ? crearVentaComoAdmin
        : crearVenta,
    {}
  );
  const errores = estado.errores ?? {};

  // CONFIRMACIÓN ANTES DE CREAR
  //
  // Cargar una venta es escribir un dato que después hay que perseguir para
  // corregir, así que el alta pasa por un resumen de lo que se va a guardar. En
  // la edición no: guardar cambios sobre algo que ya existe —y que queda en el
  // historial— no es lo mismo que crear.
  const formId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [resumen, setResumen] = useState<Resumen | null>(null);

  // Si la acción vuelve con un error, el aviso está arriba del formulario y el
  // diálogo lo estaría tapando. Se ajusta durante el render, que es como React
  // pide reaccionar a un valor que cambió: en un `useEffect` sería un render
  // encadenado de más, y acá no hay ningún sistema externo que sincronizar.
  const [ultimoEstado, setUltimoEstado] = useState(estado);
  if (estado !== ultimoEstado) {
    setUltimoEstado(estado);
    if (estado.error || estado.errores) setResumen(null);
  }

  function confirmar() {
    const form = formRef.current;
    // No tiene sentido mostrar el resumen de un formulario incompleto: primero
    // que el navegador señale lo que falta.
    if (!form || !form.reportValidity()) return;

    // Se lee del DOM y no del estado para no tener que volver controlados los
    // campos que hoy usan `defaultValue`.
    const datos = new FormData(form);
    const texto = (campo: string) => String(datos.get(campo) ?? "").trim();
    const archivo = (campo: string) => {
      const valor = datos.get(campo);
      return valor instanceof File && valor.size > 0 ? valor.name : null;
    };

    const filas: Resumen = [];

    if (eligeVendedor) {
      const elegido = vendedores.find((vendedor) => vendedor.id === texto("vendedorId"));
      filas.push({ etiqueta: "Vendedor", valor: elegido?.nombreCompleto ?? "—" });
    }

    filas.push({ etiqueta: "Plan", valor: planElegido?.nombre ?? "—" });
    filas.push({ etiqueta: "Cliente", valor: texto("nombreCliente") });
    filas.push({ etiqueta: "D.N.I", valor: texto("dni") });
    filas.push({ etiqueta: "Teléfono", valor: texto("telefono") });

    // El identificador de la venta es uno de los dos, y cuál es depende de si
    // el club ya asignó el título. Mostrar el vacío no aporta nada.
    if (texto("numeroTitulo")) {
      filas.push({ etiqueta: "Título", valor: texto("numeroTitulo") });
    } else {
      filas.push({ etiqueta: "Nro Suscripción", valor: texto("nroSuscripcion") });
    }

    const adjuntos = [
      archivo("adjuntoDni") ? "foto del DNI" : null,
      archivo("adjuntoContrato") ? "contrato" : null,
    ].filter(Boolean);
    filas.push({
      etiqueta: "Documentación",
      valor: adjuntos.length > 0 ? adjuntos.join(" y ") : "sin adjuntos",
    });

    setResumen(filas);
  }

  return (
    <form id={formId} ref={formRef} action={accion} className="max-w-3xl space-y-4">
      {edicion ? <input type="hidden" name="id" value={valores?.id} /> : null}
      {leadId ? <input type="hidden" name="leadId" value={leadId} /> : null}

      {estado.error ? (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertDescription>{estado.error}</AlertDescription>
        </Alert>
      ) : null}

      {eligeVendedor ? (
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
              required={suscripcionRequerida}
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
              required={observacionRequerida}
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
          <Campo nombre="adjuntoDni" etiqueta="Foto del DNI" errores={errores.adjuntoDni}>
            <CampoFoto
              nombre="adjuntoDni"
              etiquetaCamara="Sacar foto"
              ayuda={
                edicion
                  ? tieneDni
                    ? "Ya hay una cargada. Subí otra solo si querés reemplazarla."
                    : "Esta venta todavía no tiene el DNI cargado."
                  : "Opcional. Se puede subir después, editando la venta."
              }
            />
          </Campo>

          <Campo
            nombre="adjuntoContrato"
            etiqueta="Contrato"
            errores={errores.adjuntoContrato}
          >
            <CampoFoto
              nombre="adjuntoContrato"
              etiquetaCamara="Fotografiar"
              ayuda="Opcional."
            />
          </Campo>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        {edicion ? (
          <BotonGuardar formId={formId} etiqueta="Guardar cambios" />
        ) : (
          <Button type="button" onClick={confirmar}>
            Cargar venta
          </Button>
        )}
        <Button type="button" variant="ghost" asChild>
          <Link href={edicion ? `${base}/${valores?.id}` : base}>Cancelar</Link>
        </Button>
      </div>

      {/* El diálogo se renderiza dentro del <form> aunque Radix lo lleve al
          <body>: así el botón de confirmar sigue viendo el estado del envío por
          contexto. En el DOM queda afuera, y por eso lo que lo ata al
          formulario es el atributo `form`, que sí cruza el portal —un
          <button type="submit"> a secas no enviaría nada—. */}
      <Dialog open={resumen !== null} onOpenChange={(abierto) => !abierto && setResumen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Cargamos esta venta?</DialogTitle>
            <DialogDescription>
              Revisá los datos. Después se pueden corregir, pero la venta ya va a estar
              cargada.
            </DialogDescription>
          </DialogHeader>

          <dl className="divide-y text-sm">
            {(resumen ?? []).map((fila) => (
              <div key={fila.etiqueta} className="flex justify-between gap-4 py-1.5">
                <dt className="text-muted-foreground">{fila.etiqueta}</dt>
                <dd className="text-right font-medium">
                  {fila.valor || <span className="font-normal text-muted-foreground">—</span>}
                </dd>
              </div>
            ))}
          </dl>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setResumen(null)}>
              Revisar
            </Button>
            <BotonGuardar formId={formId} etiqueta="Confirmar y cargar" />
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}
