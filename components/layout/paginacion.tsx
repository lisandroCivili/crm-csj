import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * PAGINACION DE LOS LISTADOS
 *
 * El mismo bloque estaba copiado en las cinco pantallas que paginan, y la Fase
 * 18 iba a escribirlo dos veces mas. Se extrajo al juntar la sexta.
 *
 * UN <a> NO SE DESHABILITA
 *
 * Las copias decian `<Button asChild disabled={pagina <= 1}><Link …>`, y eso no
 * apagaba nada: `asChild` hace que el Button sea un `Slot`, asi que `disabled`
 * viaja hasta el `<a>` —donde no significa nada— y las clases del boton
 * (`disabled:opacity-50`, `disabled:pointer-events-none`) cuelgan de la
 * pseudo-clase `:disabled`, que solo existe para los controles de formulario.
 * En la pagina 1 el boton "Anterior" se veia igual de vivo que el otro y se
 * podia apretar.
 *
 * Por eso el extremo no se dibuja como link apagado sino como `<button>` de
 * verdad: es el unico elemento al que `:disabled` le aplica, y de paso el
 * teclado y el lector de pantalla se enteran. Lo que no hay que hacer es dejar
 * el `<a>` y apagarlo con clases: se veria apagado y seguiria navegando.
 */
export function Paginacion({
  pagina,
  paginas,
  enlace,
}: {
  pagina: number;
  paginas: number;
  /** Arma la URL de una pagina conservando los filtros y la busqueda activos. */
  enlace: (pagina: number) => string;
}) {
  if (paginas <= 1) return null;

  const anterior = pagina > 1;
  const siguiente = pagina < paginas;

  return (
    <div className="mt-4 flex items-center justify-between">
      <p className="text-sm text-muted-foreground">
        Página {pagina} de {paginas}
      </p>
      <div className="flex gap-2">
        {anterior ? (
          <Button variant="outline" size="sm" asChild>
            <Link href={enlace(pagina - 1)} rel="prev">
              Anterior
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Anterior
          </Button>
        )}
        {siguiente ? (
          <Button variant="outline" size="sm" asChild>
            <Link href={enlace(pagina + 1)} rel="next">
              Siguiente
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Siguiente
          </Button>
        )}
      </div>
    </div>
  );
}
