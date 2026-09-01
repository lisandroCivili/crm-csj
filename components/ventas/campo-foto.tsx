"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, FileText, FolderOpen, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * ADJUNTAR UNA FOTO DESDE LA CALLE
 *
 * El vendedor carga la venta con el cliente adelante, del teléfono, y lo que
 * necesita es sacar la foto del DNI en el momento. Un `<input type="file">`
 * pelado en el celular abre un menú del sistema donde "Cámara" es una opción
 * más entre archivos, unidades y aplicaciones.
 *
 * Dos cosas hacen que esto sirva:
 *
 *   - **Un solo input en el DOM**, al que se le pone o se le saca
 *     `capture="environment"` con JS justo antes del `.click()`. Dos inputs con
 *     el mismo `name` —uno para cámara y otro para galería— harían que el vacío
 *     pise al lleno al enviar el formulario.
 *   - **Vista previa antes de guardar.** Una foto de un DNI sacada de apuro
 *     sale movida o cortada la mitad de las veces, y sin verla no hay forma de
 *     saberlo hasta que Balta abre el adjunto una semana después.
 *
 * En escritorio `capture` se ignora y los dos botones abren el mismo selector.
 * Se muestran igual: detectar si hay cámara es frágil y el costo de
 * equivocarse —esconderle el botón a quien sí la tiene— es peor que el de un
 * botón de más.
 */

/**
 * Los mismos que acepta el servidor (`TIPOS_ADJUNTO_PERMITIDOS`).
 *
 * HEIC no está, y es a propósito: es el formato con el que un iPhone guarda sus
 * fotos, pero mientras el `accept` no lo mencione iOS transcodifica a JPEG al
 * elegir la foto. Agregarlo haría lo contrario de lo que parece — el teléfono
 * mandaría el HEIC crudo, que Chrome en Windows no puede mostrar, y Balta
 * terminaría con fotos de DNI que no puede abrir.
 */
const TIPOS = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const ACCEPT = TIPOS.join(",");

export function CampoFoto({
  nombre,
  ayuda,
  etiquetaCamara = "Sacar foto",
}: {
  nombre: string;
  ayuda?: string;
  etiquetaCamara?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [elegido, setElegido] = useState<{ nombre: string; url: string | null } | null>(
    null
  );
  const [aviso, setAviso] = useState<string | null>(null);

  // La URL del objeto ocupa memoria hasta que se la revoca a mano.
  useEffect(() => {
    const url = elegido?.url;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [elegido]);

  function abrir(conCamara: boolean) {
    const input = inputRef.current;
    if (!input) return;

    // No se vacía el input antes de abrir: si el usuario cancela el diálogo,
    // `change` no dispara y quedaría un formulario vacío que en pantalla se ve
    // lleno. Es la misma trampa del selector de archivos del padrón.
    if (conCamara) input.setAttribute("capture", "environment");
    else input.removeAttribute("capture");

    input.click();
  }

  function alElegir() {
    const archivo = inputRef.current?.files?.[0];
    if (!archivo) return;

    // Un tipo vacío es un navegador que no supo reconocerlo, no un archivo
    // inválido: en ese caso decide el servidor.
    if (archivo.type && !TIPOS.includes(archivo.type)) {
      setAviso(
        archivo.type === "image/heic" || archivo.type === "image/heif"
          ? "Esa foto está en formato HEIC, que no se puede ver desde la computadora. En el iPhone: Ajustes → Cámara → Formatos → Más compatible."
          : "Tiene que ser una imagen (JPG, PNG, WEBP) o un PDF."
      );
      quitar();
      return;
    }

    setAviso(null);
    setElegido({
      nombre: archivo.name,
      url: archivo.type.startsWith("image/") ? URL.createObjectURL(archivo) : null,
    });
  }

  function quitar() {
    if (inputRef.current) inputRef.current.value = "";
    setElegido(null);
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        id={nombre}
        name={nombre}
        type="file"
        accept={ACCEPT}
        onChange={alElegir}
        className="sr-only"
      />

      {elegido ? (
        <div className="flex items-center gap-3 rounded-md border p-2">
          {elegido.url ? (
            // Un objectURL local, no una ruta del servidor: `next/image` no
            // tiene nada que optimizar acá.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={elegido.url}
              alt={`Vista previa de ${elegido.nombre}`}
              className="size-16 shrink-0 rounded object-cover"
            />
          ) : (
            <div className="flex size-16 shrink-0 items-center justify-center rounded bg-muted">
              <FileText className="size-6 text-muted-foreground" />
            </div>
          )}

          <p className="min-w-0 flex-1 truncate text-sm">{elegido.nombre}</p>

          <Button type="button" variant="ghost" size="sm" onClick={quitar}>
            <X className="size-4" />
            Quitar
          </Button>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => abrir(true)}>
          <Camera className="size-4" />
          {elegido ? "Sacar otra" : etiquetaCamara}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => abrir(false)}>
          <FolderOpen className="size-4" />
          {elegido ? "Elegir otro archivo" : "Elegir archivo"}
        </Button>
      </div>

      {aviso ? <p className="text-xs text-destructive">{aviso}</p> : null}
      {ayuda && !aviso ? <p className="text-xs text-muted-foreground">{ayuda}</p> : null}
    </div>
  );
}
