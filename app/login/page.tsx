import { LoginForm } from "@/components/auth/login-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { volverA } = await searchParams;
  const destino = typeof volverA === "string" && volverA.startsWith("/") ? volverA : "/";

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">CRM Club San Jorge</CardTitle>
          <CardDescription>Ingresá con tu cuenta para continuar.</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm volverA={destino} />
        </CardContent>
      </Card>
    </main>
  );
}
