import { MapPin } from "lucide-react";
import { seleccionarZona } from "./actions";
import { requireAdmin, getZonaActivaId, listarZonas } from "@/lib/sesion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const ETIQUETAS: Record<string, string> = {
  SALTA: "Salta",
  TUCUMAN: "Tucumán",
};

export default async function SeleccionarZonaPage() {
  const usuario = await requireAdmin();
  const [zonas, zonaActivaId] = await Promise.all([listarZonas(), getZonaActivaId()]);

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl">Hola, {usuario.nombre.split(" ")[0]}</CardTitle>
          <CardDescription>
            Elegí la zona con la que vas a trabajar. Todo lo que veas y cargues queda
            asociado a esa zona. Podés cambiarla en cualquier momento desde el menú.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {zonas.map((zona) => (
            <form key={zona.id} action={seleccionarZona}>
              <input type="hidden" name="zonaId" value={zona.id} />
              <Button
                type="submit"
                variant={zona.id === zonaActivaId ? "default" : "outline"}
                className="h-auto w-full justify-start gap-3 py-4"
              >
                <MapPin className="size-5" />
                <span className="text-base">{ETIQUETAS[zona.nombre] ?? zona.nombre}</span>
                {zona.id === zonaActivaId ? (
                  <span className="ml-auto text-xs opacity-70">activa</span>
                ) : null}
              </Button>
            </form>
          ))}
        </CardContent>
      </Card>
    </main>
  );
}
