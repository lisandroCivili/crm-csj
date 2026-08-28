"use client";

import { useRef, useState } from "react";
import { FileSpreadsheet, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * El selector de archivos de las tres importaciones (padron, leads y precios).
 *
 * Reemplaza al `<input type="file">` pelado, que no se leia como algo
 * clickeable y, despues de elegir, seguia diciendo exactamente lo mismo: no
 * habia forma de saber si el archivo habia entrado ni cual era.
 *
 * El input real sigue existiendo y sigue siendo el que viaja en el formulario
 * —no se sube nada por JavaScript—, pero queda transparente y sin eventos por
 * encima de la zona. Se lo deja ahi y no en `display: none` a proposito: un
 * campo `required` escondido de verdad hace que el navegador no pueda mostrar
 * su propio aviso de "completá este campo".
 */

function pesoLegible(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  return kb < 1024 ? `${Math.round(kb)} kB` : `${(kb / 1024).toFixed(1)} MB`;
}

function extensionDe(nombre: string): string {
  const punto = nombre.lastIndexOf(".");
  return punto === -1 ? "" : nombre.slice(punto).toLowerCase();
}

export function SelectorArchivos({
  name,
  accept,
  multiple = false,
  requerido = true,
  invitacion,
  ayuda,
  onCambio,
}: {
  name: string;
  /** Lista de extensiones, como en el atributo `accept`: ".xls,.xlsx". */
  accept: string;
  multiple?: boolean;
  requerido?: boolean;
  /** El texto grande de la zona vacía. */
  invitacion: string;
  /** El renglón chico de abajo: qué entra y cuántos. */
  ayuda?: string;
  /** Para que el formulario pueda validar el conjunto antes de enviarlo. */
  onCambio?: (archivos: File[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [archivos, setArchivos] = useState<File[]>([]);
  const [encima, setEncima] = useState(false);
  const [rechazados, setRechazados] = useState<string[]>([]);

  const extensiones = accept
    .split(",")
    .map((ext) => ext.trim().toLowerCase())
    .filter(Boolean);

  /**
   * `input.files` es de sólo lectura salvo que se le asigne un `FileList`, y la
   * única forma de fabricar uno a mano es con un `DataTransfer`. Es lo que
   * permite sacar un archivo de la selección sin obligar a elegirlos todos de
   * nuevo.
   */
  const aplicar = (lista: File[]) => {
    const transferencia = new DataTransfer();
    for (const archivo of lista) transferencia.items.add(archivo);
    if (inputRef.current) inputRef.current.files = transferencia.files;
    setArchivos(lista);
    onCambio?.(lista);
  };

  const sumar = (entrantes: File[]) => {
    const aceptados: File[] = [];
    const fuera: string[] = [];

    for (const archivo of entrantes) {
      if (extensiones.length > 0 && !extensiones.includes(extensionDe(archivo.name))) {
        fuera.push(archivo.name);
      } else {
        aceptados.push(archivo);
      }
    }

    setRechazados(fuera);
    if (aceptados.length === 0) return;

    if (!multiple) return aplicar([aceptados[0]]);

    // Se acumulan las tandas: arrastrar tres y después uno más es lo natural.
    // El mismo archivo dos veces se importaría dos veces, así que se descarta
    // por nombre y peso, que es lo único con lo que se lo puede reconocer.
    const vistos = new Set(archivos.map((a) => `${a.name}:${a.size}`));
    const nuevos = aceptados.filter((a) => !vistos.has(`${a.name}:${a.size}`));
    aplicar([...archivos, ...nuevos]);
  };

  const quitar = (indice: number) => {
    setRechazados([]);
    aplicar(archivos.filter((_, i) => i !== indice));
  };

  /**
   * El input NO se vacía antes de abrir el selector, aunque la primera versión
   * lo hacía: si el usuario cancela el cuadro de diálogo, `change` no dispara y
   * el input quedaría sin archivos mientras la lista de la pantalla los sigue
   * mostrando. Se enviaría un formulario vacío sin que nada lo delate.
   */
  const abrirSelector = () => inputRef.current?.click();

  const vacio = archivos.length === 0;

  return (
    <div className="space-y-2">
      <div
        onDragOver={(evento) => {
          evento.preventDefault();
          setEncima(true);
        }}
        onDragLeave={() => setEncima(false)}
        onDrop={(evento) => {
          evento.preventDefault();
          setEncima(false);
          sumar([...evento.dataTransfer.files]);
        }}
        className={cn(
          "relative rounded-lg border-2 border-dashed transition-colors",
          encima ? "border-primary bg-brand-muted" : "border-input",
          vacio ? "" : "border-solid bg-muted/30"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          name={name}
          accept={accept}
          multiple={multiple}
          required={requerido}
          onChange={(evento) => sumar([...(evento.target.files ?? [])])}
          className="pointer-events-none absolute inset-0 size-full opacity-0"
          tabIndex={-1}
        />

        {vacio ? (
          <button
            type="button"
            onClick={abrirSelector}
            className="flex w-full flex-col items-center gap-2 px-4 py-8 text-center outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <Upload className="size-6 text-muted-foreground" />
            <span className="text-sm font-medium">{invitacion}</span>
            {ayuda ? <span className="text-xs text-muted-foreground">{ayuda}</span> : null}
          </button>
        ) : (
          <div className="space-y-3 p-3">
            <ul className="space-y-1.5">
              {archivos.map((archivo, indice) => (
                <li
                  key={`${archivo.name}:${archivo.size}`}
                  className="flex items-center gap-3 rounded-md border bg-background p-2"
                >
                  <FileSpreadsheet className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 break-all text-sm">{archivo.name}</span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {pesoLegible(archivo.size)}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0"
                    onClick={() => quitar(indice)}
                    aria-label={`Sacar ${archivo.name}`}
                  >
                    <X className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>

            <Button type="button" variant="outline" size="sm" onClick={abrirSelector}>
              {multiple ? "Agregar más archivos" : "Cambiar el archivo"}
            </Button>
          </div>
        )}
      </div>

      {rechazados.length > 0 ? (
        <p className="text-xs text-destructive">
          {rechazados.length === 1
            ? `Se ignoró ${rechazados[0]}: `
            : `Se ignoraron ${rechazados.length} archivos: `}
          acá sólo entran {extensiones.join(", ")}.
        </p>
      ) : null}
    </div>
  );
}
