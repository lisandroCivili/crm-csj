"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { cambiarPermisoVendedor } from "@/app/admin/vendedores/actions";
import { Switch } from "@/components/ui/switch";

type Clave = "puedeVerLeads" | "puedeCargarVentas" | "puedeVerComision";

const SECCIONES: { clave: Clave; etiqueta: string; detalle: string }[] = [
  {
    clave: "puedeVerLeads",
    etiqueta: "Sus leads",
    detalle: "Ver los leads que le asignás y cambiarles el estado.",
  },
  {
    clave: "puedeCargarVentas",
    etiqueta: "Sus ventas",
    detalle: "Cargar ventas nuevas y ver las que ya cargó.",
  },
  {
    clave: "puedeVerComision",
    etiqueta: "Su comisión",
    detalle: "Ver cuánto le corresponde este mes. No cambia lo que cobra.",
  },
];

/**
 * Los permisos se guardan al tocar el interruptor, sin boton de confirmar. Es
 * el mismo criterio que los gastos de representacion: un cambio chico y solo,
 * que no tiene sentido acumular en un formulario.
 *
 * El vendedor los ve aplicados en su proximo click: no se guardan en su sesion.
 */
export function PermisosVendedor({
  vendedorId,
  valores,
  sinCuenta,
}: {
  vendedorId: string;
  valores: Record<Clave, boolean>;
  sinCuenta: boolean;
}) {
  const [estado, setEstado] = useState(valores);
  const [pendiente, empezar] = useTransition();

  function alternar(clave: Clave, valor: boolean) {
    const previo = estado[clave];
    setEstado((actual) => ({ ...actual, [clave]: valor }));

    empezar(async () => {
      const resultado = await cambiarPermisoVendedor({ vendedorId, permiso: clave, valor });

      if (resultado.error) {
        setEstado((actual) => ({ ...actual, [clave]: previo }));
        toast.error(resultado.error);
        return;
      }

      toast.success(valor ? "Permiso activado." : "Permiso desactivado.");
    });
  }

  return (
    <div className="space-y-1">
      {SECCIONES.map(({ clave, etiqueta, detalle }) => (
        <label
          key={clave}
          className="flex cursor-pointer items-start justify-between gap-4 rounded-lg px-2 py-3 hover:bg-muted/50"
        >
          <span className="min-w-0">
            <span className="block text-sm font-medium">{etiqueta}</span>
            <span className="block text-xs leading-relaxed text-muted-foreground">
              {detalle}
            </span>
          </span>
          <Switch
            checked={estado[clave]}
            onCheckedChange={(valor) => alternar(clave, valor)}
            disabled={pendiente}
            aria-label={etiqueta}
            className="mt-0.5 shrink-0"
          />
        </label>
      ))}

      {sinCuenta ? (
        <p className="px-2 pt-2 text-xs text-muted-foreground">
          Todavía no tiene cuenta de ingreso: los permisos van a aplicar cuando se la crees.
        </p>
      ) : null}
    </div>
  );
}
