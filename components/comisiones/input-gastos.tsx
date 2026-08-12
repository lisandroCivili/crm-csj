"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { guardarGastos } from "@/app/admin/comisiones/actions";
import { Input } from "@/components/ui/input";

/**
 * Los gastos de representacion son un importe que Balta agrega a mano al
 * periodo. Se guardan al salir del campo: la fila vive dentro de una tabla, y
 * un formulario por fila obligaria a romper el markup de la tabla.
 */
export function InputGastos({
  vendedorId,
  periodo,
  valor,
  deshabilitado,
}: {
  vendedorId: string;
  periodo: string;
  valor: number;
  deshabilitado?: boolean;
}) {
  const inicial = valor === 0 ? "" : String(valor).replace(".", ",");
  const [texto, setTexto] = useState(inicial);
  const guardado = useRef(inicial);
  const [pendiente, empezar] = useTransition();

  function guardar() {
    if (texto.trim() === guardado.current.trim()) return;

    empezar(async () => {
      const resultado = await guardarGastos({ vendedorId, periodo, importe: texto });

      if (resultado.error) {
        toast.error(resultado.error);
        setTexto(guardado.current);
        return;
      }

      guardado.current = texto;
      toast.success("Gastos de representación actualizados.");
    });
  }

  return (
    <Input
      value={texto}
      onChange={(evento) => setTexto(evento.target.value)}
      onBlur={guardar}
      onKeyDown={(evento) => {
        if (evento.key === "Enter") evento.currentTarget.blur();
        if (evento.key === "Escape") setTexto(guardado.current);
      }}
      disabled={deshabilitado || pendiente}
      inputMode="decimal"
      placeholder="0"
      aria-label="Gastos de representación"
      className="h-8 w-28 text-right tabular-nums"
    />
  );
}
