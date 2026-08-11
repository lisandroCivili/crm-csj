import { LoginForm } from "@/components/auth/login-form";
import { Marca } from "@/components/layout/marca";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { volverA } = await searchParams;
  const destino = typeof volverA === "string" && volverA.startsWith("/") ? volverA : "/";

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
