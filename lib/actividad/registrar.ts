/**
 * ESCRIBIR EN EL FEED DE ACTIVIDAD
 *
 * Seis acciones distintas registran actividad —dos de leads, tres de ventas y
 * una de clientes— y todas escriben la misma fila. El helper existe para que el
 * shape se arme en un solo lugar: sin esto, la sexta copia es la que se olvida
 * de poner la zona.
 *
 * DOS REGLAS QUE NO SE VEN EN EL TIPO:
 *
 * 1. **Se escribe dentro de la transaccion que la accion ya tiene abierta.** Si
 *    la venta se guarda y la actividad no, el feed miente; y al reves, una
 *    actividad de algo que no llego a pasar es peor todavia. Por eso el helper
 *    recibe el `tx` y no toca `db` por su cuenta.
 *
 * 2. **`vendedorId` y `actorUserId` no son lo mismo.** El vendedor es a nombre
 *    de quien queda el movimiento —es el eje del filtro de la pantalla—; el
 *    actor es quien apreto el boton. Cuando Balta carga una venta a nombre de
 *    Nancy, el filtro tiene que traerla por Nancy y la pantalla mostrar que la
 *    cargo Balta.
 */
import type {
  ActividadTipo,
  LeadEstado,
  Prisma,
} from "@/lib/generated/prisma/client";

/** El cliente de una transaccion abierta (`db.$transaction(async (tx) => …)`). */
type ClienteTx = Prisma.TransactionClient;

export type DatosActividad = {
  tipo: ActividadTipo;
  zonaId: number;
  /** A nombre de quien queda. Null para una correccion de cliente. */
  vendedorId?: string | null;
  /** De cual de los tres cuelga. Cada actividad usa uno solo. */
  leadId?: string | null;
  ventaId?: string | null;
  clienteId?: string | null;
  estadoAnterior?: LeadEstado | null;
  estadoNuevo?: LeadEstado | null;
  detalle?: string | null;
  /** Diff { campo: { antes, despues } }, el mismo que va a `VentaHistorial`. */
  cambios?: Prisma.InputJsonValue;
  /** Quien lo hizo. */
  actorUserId: string;
};

/**
 * La fila lista para `create` o `createMany`. Se expone aparte porque la
 * asignacion masiva de leads escribe N actividades de una: hacerlas con N
 * `create` seria un viaje a la base por lead.
 */
export function datosActividad(datos: DatosActividad): Prisma.ActividadCreateManyInput {
  return {
    tipo: datos.tipo,
    zonaId: datos.zonaId,
    vendedorId: datos.vendedorId ?? null,
    leadId: datos.leadId ?? null,
    ventaId: datos.ventaId ?? null,
    clienteId: datos.clienteId ?? null,
    estadoAnterior: datos.estadoAnterior ?? null,
    estadoNuevo: datos.estadoNuevo ?? null,
    detalle: datos.detalle ?? null,
    // `undefined` deja la columna en NULL; pasarle `null` a una columna Json de
    // Prisma significa otra cosa (`Prisma.JsonNull`) y no es lo que se quiere.
    cambios: datos.cambios ?? undefined,
    actorUserId: datos.actorUserId,
  };
}

export function registrarActividad(tx: ClienteTx, datos: DatosActividad) {
  return tx.actividad.create({ data: datosActividad(datos) });
}
