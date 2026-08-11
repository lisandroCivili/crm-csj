"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { UserPlus } from "lucide-react";
import { asignarLeads } from "@/app/admin/leads/actions";
import { BadgeEstado } from "./badge-estado";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ETIQUETA_ORIGEN } from "@/lib/validations/lead";
import type { LeadEstado, LeadOrigen } from "@/lib/generated/prisma/client";

export type LeadFila = {
  id: string;
  nombre: string;
  telefono: string | null;
  localidad: string | null;
  provincia: string | null;
  origen: LeadOrigen;
  estado: LeadEstado;
  motivoDevolucion: string | null;
  vendedorAsignado: { id: string; nombreCompleto: string } | null;
};

export function TablaLeads({
  leads,
  vendedores,
}: {
  leads: LeadFila[];
  vendedores: { id: string; nombreCompleto: string }[];
}) {
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());

  const alternar = (id: string, marcado: boolean) => {
    setSeleccionados((previo) => {
      const nuevo = new Set(previo);
      if (marcado) nuevo.add(id);
      else nuevo.delete(id);
      return nuevo;
    });
  };

  const todosMarcados = leads.length > 0 && seleccionados.size === leads.length;

  return (
    <form action={asignarLeads}>
      {seleccionados.size > 0 ? (
        <BarraAsignacion cantidad={seleccionados.size} vendedores={vendedores} />
      ) : null}

      {[...seleccionados].map((id) => (
        <input key={id} type="hidden" name="leadId" value={id} />
      ))}

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={todosMarcados}
                  onCheckedChange={(marcado) =>
                    setSeleccionados(marcado ? new Set(leads.map((l) => l.id)) : new Set())
                  }
                  aria-label="Seleccionar todos"
                />
              </TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Localidad</TableHead>
              <TableHead>Origen</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Vendedor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead) => (
              <TableRow key={lead.id} data-state={seleccionados.has(lead.id) ? "selected" : undefined}>
                <TableCell>
                  <Checkbox
                    checked={seleccionados.has(lead.id)}
                    onCheckedChange={(marcado) => alternar(lead.id, marcado === true)}
                    aria-label={`Seleccionar ${lead.nombre}`}
                  />
                </TableCell>
                <TableCell className="font-medium">{lead.nombre}</TableCell>
                <TableCell className="tabular-nums">{lead.telefono ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">
                  {[lead.localidad, lead.provincia].filter(Boolean).join(", ") || "—"}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{ETIQUETA_ORIGEN[lead.origen]}</Badge>
                </TableCell>
                <TableCell>
                  <BadgeEstado estado={lead.estado} />
                  {lead.motivoDevolucion ? (
                    <p className="mt-1 max-w-48 truncate text-xs text-muted-foreground">
                      {lead.motivoDevolucion}
                    </p>
                  ) : null}
                </TableCell>
                <TableCell className="text-sm">
                  {lead.vendedorAsignado?.nombreCompleto ?? (
                    <span className="text-muted-foreground">sin asignar</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </form>
  );
}

function BarraAsignacion({
  cantidad,
  vendedores,
}: {
  cantidad: number;
  vendedores: { id: string; nombreCompleto: string }[];
}) {
  const { pending } = useFormStatus();

  return (
    <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border bg-muted/40 p-3">
      <span className="text-sm font-medium">
        {cantidad} lead{cantidad === 1 ? "" : "s"} seleccionado{cantidad === 1 ? "" : "s"}
      </span>
      <select
        name="vendedorId"
        required
        defaultValue=""
        className="h-9 min-w-52 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <option value="">— asignar a —</option>
        {vendedores.map((vendedor) => (
          <option key={vendedor.id} value={vendedor.id}>
            {vendedor.nombreCompleto}
          </option>
        ))}
      </select>
      <Button type="submit" size="sm" disabled={pending}>
        <UserPlus className="size-4" />
        {pending ? "Asignando…" : "Asignar"}
      </Button>
    </div>
  );
}
