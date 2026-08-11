import { Construction } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

/** Placeholder de las secciones que todavia no se implementaron. */
export function EnConstruccion({ fase }: { fase: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        <Construction className="size-8 text-muted-foreground" />
        <div>
          <p className="font-medium">Todavía no está implementado</p>
          <p className="text-sm text-muted-foreground">Corresponde a la {fase}.</p>
        </div>
      </CardContent>
    </Card>
  );
}
