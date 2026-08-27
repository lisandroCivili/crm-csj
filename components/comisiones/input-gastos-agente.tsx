"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { guardarGastosAgente } from "@/app/admin/comisiones/agente/actions";
import { Input } from "@/components/ui/input";

/**
 * Gastos de representacion del agente. Se guardan al salir del campo, igual que
 * los del vendedor, pero NO se suman a la comision: el club los paga aparte y
 * los ajusta por inflacion, asi que el importe se escribe a mano cada mes.
 */
export function InputGastosAgente({
  periodo,
  valor,
  deshabilitado,
}: {
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
      const resultado = await guardarGastosAgente({ periodo, importe: texto });

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
      aria-label="Gastos de representación del agente"
      className="h-8 w-32 text-right tabular-nums"
    />
  );
}
