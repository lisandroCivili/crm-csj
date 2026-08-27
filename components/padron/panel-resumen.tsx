import { Layers } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/**
 * El mismo panel de cifras que se ve al analizar un archivo, para poder volver
 * a mirarlo despues en el historico. Antes el analisis era la unica oportunidad
 * de ver estos numeros: al confirmar se perdian.
 */

export type CifrasPadron = {
  clientesNuevos: number;
  clientesActualizados: number;
  titulosNuevos: number;
  titulosActualizados: number;
  titulosNuevosVenta: number;
  titulosNuevosRenovacion: number;
  cuotasNuevas: number;
  cuotasActualizadas: number;
  cuotasSinCambios: number;
  cuotasRecienPagadas: number;
  esLineaBase: boolean;
};

export function Cifra({
  etiqueta,
  valor,
  detalle,
  destacado,
}: {
  etiqueta: string;
  /** null se muestra como "—": el dato no aplica, no es un cero. */
  valor: number | null;
  detalle?: string;
  destacado?: boolean;
}) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{etiqueta}</p>
      <p
        className={`mt-1 text-2xl font-semibold tabular-nums ${
          destacado && valor !== null && valor > 0 ? "text-primary" : ""
        }`}
      >
        {valor === null ? "—" : valor.toLocaleString("es-AR")}
      </p>
      {detalle ? <p className="mt-0.5 text-xs text-muted-foreground">{detalle}</p> : null}
    </div>
  );
}

/**
 * `enPasado` cambia solo la redaccion: en el preview todavia no paso nada
 * ("van a entrar"), en el historico ya esta hecho.
 */
export function PanelResumenPadron({
  cifras,
  enPasado = false,
}: {
  cifras: CifrasPadron;
  enPasado?: boolean;
}) {
  const base = cifras.esLineaBase;

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Cifra etiqueta="Clientes nuevos" valor={cifras.clientesNuevos} />
        <Cifra etiqueta="Clientes con cambios" valor={cifras.clientesActualizados} />
        <Cifra etiqueta="Títulos nuevos" valor={cifras.titulosNuevos} detalle="en total" />
        <Cifra
          etiqueta="Ventas nuevas"
          valor={base ? null : cifras.titulosNuevosVenta}
          detalle={base ? "sin padrón anterior" : "entraron con cuota 1"}
          destacado
        />
        <Cifra
          etiqueta="Renovaciones"
          valor={base ? null : cifras.titulosNuevosRenovacion}
          detalle={base ? "sin padrón anterior" : "entraron con cuota > 1"}
          destacado
        />
        <Cifra etiqueta="Títulos con cambios" valor={cifras.titulosActualizados} />
        <Cifra etiqueta="Cuotas nuevas" valor={cifras.cuotasNuevas} />
        <Cifra etiqueta="Cuotas con cambios" valor={cifras.cuotasActualizadas} />
        <Cifra
          etiqueta="Cuotas ya cargadas"
          valor={cifras.cuotasSinCambios}
          detalle={enPasado ? "no se tocaron" : "no se tocan"}
        />
        <Cifra
          etiqueta="Recién cobradas"
          valor={cifras.cuotasRecienPagadas}
          detalle={enPasado ? "pasaron de impagas a pagadas" : "pasan de impagas a pagadas"}
          destacado
        />
      </div>

      {base ? (
        <Alert>
          <Layers />
          <AlertTitle>
            {enPasado ? "Fue el primer padrón de la zona" : "Es el primer padrón de la zona"}
          </AlertTitle>
          <AlertDescription>
            No hay padrón anterior contra el cual comparar, así que sus{" "}
            {cifras.titulosNuevos.toLocaleString("es-AR")} títulos quedan marcados como
            históricos. La distinción entre venta nueva y renovación arranca en la próxima
            importación.
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
