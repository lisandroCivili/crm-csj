import { Check, LogOut, X } from "lucide-react";
import { FormContacto } from "@/components/perfil/form-contacto";
import { FormEmail } from "@/components/perfil/form-email";
import { FormPassword } from "@/components/perfil/form-password";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cerrarSesion } from "@/lib/acciones-sesion";
import { db } from "@/lib/db";
import { getZonaActiva, requireUsuario } from "@/lib/sesion";

const ETIQUETA_ZONA: Record<string, string> = { SALTA: "Salta", TUCUMAN: "Tucumán" };

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

function Permiso({ activo, etiqueta }: { activo: boolean; etiqueta: string }) {
  return (
    <li className="flex items-center gap-2 text-sm">
      {activo ? (
        <Check className="size-4 shrink-0 text-success" />
      ) : (
        <X className="size-4 shrink-0 text-muted-foreground" />
      )}
      <span className={activo ? "" : "text-muted-foreground line-through"}>{etiqueta}</span>
    </li>
  );
}

export default async function PerfilPage() {
  const usuario = await requireUsuario();
  const esAdmin = usuario.role === "ADMIN";

  const [zona, cuenta, vendedor] = await Promise.all([
    getZonaActiva(),
    db.user.findUniqueOrThrow({
      where: { id: usuario.id },
      select: { telefono: true, codigoAgente: true },
    }),
    usuario.vendedorId
      ? db.vendedor.findUnique({
          where: { id: usuario.vendedorId },
          select: {
            nombreCompleto: true,
            dni: true,
            codigo: true,
            telefono: true,
            email: true,
            direccion: true,
            topeCuotasComision: true,
            condiciones: true,
          },
        })
      : null,
  ]);

  return (
    <>
      <PageHeader
        titulo="Mi perfil"
        descripcion="Tus datos y la forma de entrar al sistema."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Datos de contacto</CardTitle>
            <CardDescription>
              {esAdmin
                ? "Cómo te muestra el sistema y por dónde te ubican."
                : "Estos son los datos que ve la administración para contactarte."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormContacto
              esAdmin={esAdmin}
              valores={{
                nombre: usuario.nombre,
                telefono: esAdmin ? cuenta.telefono : (vendedor?.telefono ?? null),
                codigoAgente: cuenta.codigoAgente,
                email: vendedor?.email ?? null,
                direccion: vendedor?.direccion ?? null,
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tu cuenta</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
              <Dato etiqueta="Nombre" valor={usuario.nombre} />
              <Dato etiqueta="Email de ingreso" valor={usuario.email} />
              <Dato
                etiqueta="Rol"
                valor={<Badge variant="secondary">{esAdmin ? "Administración" : "Vendedor"}</Badge>}
              />
              <Dato
                etiqueta="Zona"
                valor={zona ? (ETIQUETA_ZONA[zona.nombre] ?? zona.nombre) : null}
              />
              {/* El codigo de agente es de la persona, no de la zona: por eso
                  va en "Tu cuenta" y no en la ficha de vendedor, que si es por
                  zona y tiene su propio codigo. */}
              {esAdmin ? (
                <Dato
                  etiqueta="Código de agente"
                  valor={
                    cuenta.codigoAgente ? (
                      <span className="font-mono">{cuenta.codigoAgente}</span>
                    ) : null
                  }
                />
              ) : null}
            </dl>

            <Separator className="my-5" />

            <form action={cerrarSesion}>
              <Button type="submit" variant="outline" className="w-full">
                <LogOut className="size-4" />
                Cerrar sesión
              </Button>
            </form>
          </CardContent>
        </Card>

        {vendedor ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tu ficha</CardTitle>
              <CardDescription>
                Esto lo administra la agencia. Si hay algo mal, avisale a Balta.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                <Dato etiqueta="Nombre completo" valor={vendedor.nombreCompleto} />
                <Dato etiqueta="DNI" valor={vendedor.dni} />
                <Dato etiqueta="Código" valor={vendedor.codigo} />
                <Dato etiqueta="Cobrás comisión hasta" valor={`c${vendedor.topeCuotasComision}`} />
                <div className="sm:col-span-2">
                  <Dato etiqueta="Condiciones" valor={vendedor.condiciones} />
                </div>
              </dl>

              <Separator className="my-5" />

              <p className="mb-3 text-xs uppercase tracking-wide text-muted-foreground">
                Lo que podés hacer
              </p>
              <ul className="space-y-2">
                <Permiso activo={usuario.permisos.verLeads} etiqueta="Ver y trabajar tus leads" />
                <Permiso activo={usuario.permisos.cargarVentas} etiqueta="Cargar y ver tus ventas" />
                <Permiso activo={usuario.permisos.verComision} etiqueta="Ver tu comisión del mes" />
              </ul>
            </CardContent>
          </Card>
        ) : null}

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Contraseña</CardTitle>
            <CardDescription>
              Elegí una que no uses en otro lado. No se la pases a nadie: todo lo que se hace
              con tu cuenta queda registrado a tu nombre.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormPassword />
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">Email de ingreso</CardTitle>
            <CardDescription>
              Es con el que entrás al sistema. Si lo cambiás, la próxima vez tenés que usar el
              nuevo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormEmail email={usuario.email} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
