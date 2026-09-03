import { Info } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";
import { Marca } from "@/components/layout/marca";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { rutaInterna } from "@/lib/navegacion";

/** Por que lo sacamos del sistema. Lo manda /api/salir. */
const MOTIVOS: Record<string, string> = {
  "cuenta-inactiva":
    "Tu cuenta está desactivada. Hablá con la administración para que te la habiliten.",
  "sesion-vencida": "Tu sesión venció. Entrá de nuevo.",
  "password-cambiada": "Listo, cambiaste la contraseña. Entrá con la nueva.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { volverA, motivo } = await searchParams;
  const destino = rutaInterna(volverA);
  const aviso = typeof motivo === "string" ? MOTIVOS[motivo] : undefined;

  return (
    <main className="relative flex flex-1 items-center justify-center p-6">
      {/* Un velo del rojo de marca, apenas perceptible, para que la pantalla de
          ingreso no sea una caja blanca sin identidad. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60rem_40rem_at_50%_-20%,var(--accent),transparent)]"
      />

      <div className="relative w-full max-w-sm">
        <Marca bajada="Capitalización y Ahorro" className="mb-6 justify-center" />

        {aviso ? (
          <Alert className="mb-4">
            <Info />
            <AlertDescription>{aviso}</AlertDescription>
          </Alert>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Ingresar</CardTitle>
            <CardDescription>Entrá con tu cuenta para continuar.</CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm volverA={destino} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
