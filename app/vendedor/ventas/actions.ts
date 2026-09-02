"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { registrarActividad } from "@/lib/actividad/registrar";
import {
  TAMANIO_MAXIMO_ADJUNTO,
  TIPOS_ADJUNTO_PERMITIDOS,
  borrarAdjunto,
  guardarAdjunto,
} from "@/lib/archivos";
import { db } from "@/lib/db";
import { requireAdmin, requirePermiso, requireZonaActivaId } from "@/lib/sesion";
import { CAMPOS_HISTORIAL, anulacionSchema, ventaSchema } from "@/lib/validations/venta";
import type { AdjuntoTipo } from "@/lib/generated/prisma/client";

export type EstadoVenta = {
  error?: string;
  errores?: Record<string, string[] | undefined>;
};

type ArchivoValidado = { contenido: Buffer; mimeType: string; size: number };

/** Valida tipo y tamanio antes de tocar el disco. */
async function validarArchivo(
  valor: FormDataEntryValue | null,
  etiqueta: string
): Promise<{ archivo: ArchivoValidado | null; error?: string }> {
  if (!(valor instanceof File) || valor.size === 0) return { archivo: null };

  if (!TIPOS_ADJUNTO_PERMITIDOS.includes(valor.type as (typeof TIPOS_ADJUNTO_PERMITIDOS)[number])) {
    return { archivo: null, error: `${etiqueta}: tiene que ser una imagen (JPG, PNG, WEBP) o un PDF.` };
  }
  if (valor.size > TAMANIO_MAXIMO_ADJUNTO) {
    return { archivo: null, error: `${etiqueta}: no puede superar los 10 MB.` };
  }

  return {
    archivo: {
      contenido: Buffer.from(await valor.arrayBuffer()),
      mimeType: valor.type,
      size: valor.size,
    },
  };
}

/**
 * A nombre de quien queda la venta y quien la esta cargando. Son dos cosas
 * distintas: Balta y Pedro cargan ventas propias desde /admin, y el dia que
 * carguen una de otro vendedor el adjunto tiene que quedar a nombre de quien lo
 * subio, no del vendedor.
 */
type ContextoVenta = {
  vendedorId: string;
  zonaId: number;
  /** Usuario que sube los adjuntos y firma la actividad del lead. */
  userId: string;
  /** Adonde se vuelve una vez creada. */
  destino: (ventaId: string) => string;
};

/**
 * El alta de la venta en si. Vive aparte de las acciones porque hay dos puertas
 * de entrada —el vendedor desde /vendedor y el admin desde /admin— y la unica
 * diferencia entre ellas es quien valida el permiso y de donde sale el vendedor.
 */
async function registrarVenta(
  ctx: ContextoVenta,
  formData: FormData
): Promise<EstadoVenta> {
  const parsed = ventaSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { errores: z.flattenError(parsed.error).fieldErrors };
  }

  const dni = await validarArchivo(formData.get("adjuntoDni"), "Foto del DNI");
  if (dni.error) return { error: dni.error };
  // La foto del DNI paso a ser opcional (Balta, 27/08/2026): frenaba el alta de
  // ventas que se cargan desde la calle, con el cliente adelante y sin la foto
  // sacada todavia. Se sigue pudiendo subir despues, editando la venta.

  const contrato = await validarArchivo(formData.get("adjuntoContrato"), "Contrato");
  if (contrato.error) return { error: contrato.error };

  const plan = await db.plan.findFirst({
    where: { id: parsed.data.planId, activo: true },
    select: { id: true, codigoProducto: true },
  });
  if (!plan) return { errores: { planId: ["Ese plan ya no está disponible."] } };

  const leadId = String(formData.get("leadId") ?? "") || null;

  // Los archivos se escriben antes que la venta porque el disco no participa de
  // la transaccion; si despues falla la base, se borran a mano.
  const rutas: string[] = [];
  let ventaId: string;

  try {
    const rutaDni = dni.archivo
      ? await guardarAdjunto(dni.archivo.contenido, dni.archivo.mimeType)
      : null;
    if (rutaDni) rutas.push(rutaDni);

    const rutaContrato = contrato.archivo
      ? await guardarAdjunto(contrato.archivo.contenido, contrato.archivo.mimeType)
      : null;
    if (rutaContrato) rutas.push(rutaContrato);

    const venta = await db.$transaction(async (tx) => {
      const creada = await tx.venta.create({
        data: {
          vendedorId: ctx.vendedorId,
          zonaId: ctx.zonaId,
          nombreCliente: parsed.data.nombreCliente,
          dni: parsed.data.dni,
          telefono: parsed.data.telefono,
          direccion: parsed.data.direccion,
          nroSuscripcion: parsed.data.nroSuscripcion,
          numeroTitulo: parsed.data.numeroTitulo,
          observacion: parsed.data.observacion,
          planId: plan.id,
          codigoProducto: plan.codigoProducto,
          ...(leadId ? { leadId } : {}),
        },
        select: { id: true },
      });

      await registrarActividad(tx, {
        tipo: "VENTA_ALTA",
        zonaId: ctx.zonaId,
        // A nombre del vendedor, no de quien la carga: cuando Balta carga una
        // venta ajena, el filtro tiene que traerla por el vendedor.
        vendedorId: ctx.vendedorId,
        ventaId: creada.id,
        detalle: `${parsed.data.nombreCliente} · ${plan.codigoProducto}`,
        actorUserId: ctx.userId,
      });

      if (rutaDni && dni.archivo) {
        await tx.ventaAdjunto.create({
          data: {
            ventaId: creada.id,
            tipo: "DNI",
            path: rutaDni,
            mimeType: dni.archivo.mimeType,
            size: dni.archivo.size,
            subidoPorUserId: ctx.userId,
          },
        });
      }

      if (rutaContrato && contrato.archivo) {
        await tx.ventaAdjunto.create({
          data: {
            ventaId: creada.id,
            tipo: "CONTRATO",
            path: rutaContrato,
            mimeType: contrato.archivo.mimeType,
            size: contrato.archivo.size,
            subidoPorUserId: ctx.userId,
          },
        });
      }

      // Si la venta salio de un lead, el lead queda marcado como vendido.
      if (leadId) {
        const lead = await tx.lead.findFirst({
          where: { id: leadId, vendedorAsignadoId: ctx.vendedorId },
          select: { id: true, estado: true },
        });
        if (lead && lead.estado !== "VENDIDO") {
          await tx.lead.update({ where: { id: lead.id }, data: { estado: "VENDIDO" } });
          await registrarActividad(tx, {
            tipo: "LEAD_CAMBIO_ESTADO",
            zonaId: ctx.zonaId,
            vendedorId: ctx.vendedorId,
            leadId: lead.id,
            estadoAnterior: lead.estado,
            estadoNuevo: "VENDIDO",
            detalle: "Se cargó la venta",
            actorUserId: ctx.userId,
          });
        }
      }

      return creada;
    });

    ventaId = venta.id;
  } catch (error) {
    // Si la base fallo, los archivos ya escritos quedarian huerfanos.
    await Promise.all(rutas.map(borrarAdjunto));
    throw error;
  }

  revalidatePath("/vendedor/ventas");
  revalidatePath("/admin/ventas");
  revalidatePath("/admin/actividad");
  // Fuera del try: redirect() se implementa lanzando, y adentro se confundiria
  // con un fallo y borraria los adjuntos recien guardados.
  redirect(ctx.destino(ventaId));
}

export async function crearVenta(
  _previo: EstadoVenta,
  formData: FormData
): Promise<EstadoVenta> {
  const usuario = await requirePermiso("cargarVentas");

  const vendedor = await db.vendedor.findUniqueOrThrow({
    where: { id: usuario.vendedorId },
    select: { zonaId: true },
  });

  return registrarVenta(
    {
      vendedorId: usuario.vendedorId,
      zonaId: vendedor.zonaId,
      userId: usuario.id,
      destino: (id) => `/vendedor/ventas/${id}`,
    },
    formData
  );
}

/**
 * Alta desde /admin. Balta y Pedro venden ademas de administrar, asi que cargan
 * su propia venta sin pasar por una cuenta de vendedor.
 *
 * El vendedor llega por formulario, asi que se valida contra la zona activa: un
 * id copiado a mano no puede meter una venta en la otra zona.
 */
export async function crearVentaComoAdmin(
  _previo: EstadoVenta,
  formData: FormData
): Promise<EstadoVenta> {
  const usuario = await requireAdmin();
  const zonaId = await requireZonaActivaId();

  const vendedorId = String(formData.get("vendedorId") ?? "");
  const vendedor = await db.vendedor.findFirst({
    where: { id: vendedorId, zonaId, activo: true },
    select: { id: true },
  });
  if (!vendedor) {
    return { errores: { vendedorId: ["Elegí un vendedor de esta zona."] } };
  }

  return registrarVenta(
    {
      vendedorId: vendedor.id,
      zonaId,
      userId: usuario.id,
      destino: () => "/admin/ventas",
    },
    formData
  );
}

/**
 * Quien edita y hasta donde llega. El vendedor solo toca sus ventas; el admin,
 * todas las de la zona activa. Todo lo demas —la validacion, el diff que va al
 * historial, los adjuntos y la transaccion— es identico, y por eso vive una
 * sola vez: Lisandro pidio que el admin tuviera exactamente las mismas
 * opciones que el vendedor, no un subconjunto parecido.
 */
type ContextoEdicion = {
  userId: string;
  /** Lo que ademas del id tiene que cumplir la venta para poder editarse. */
  alcance: { vendedorId: string } | { zonaId: number };
  destino: (ventaId: string) => string;
};

/**
 * Los valores del historial se normalizan a tipos JSON simples porque la
 * columna es Json.
 */
type ValorHistorial = string | number | boolean | null;

const aValor = (valor: unknown): ValorHistorial =>
  valor === null || valor === undefined
    ? null
    : typeof valor === "string" || typeof valor === "number" || typeof valor === "boolean"
      ? valor
      : String(valor);

/** Las pantallas que muestran una venta, tras tocarla. */
function revalidarVenta(id: string) {
  revalidatePath("/vendedor/ventas");
  revalidatePath(`/vendedor/ventas/${id}`);
  revalidatePath("/admin/ventas");
  revalidatePath(`/admin/ventas/${id}`);
  // Editar, anular y reactivar entran al feed de Actividad.
  revalidatePath("/admin/actividad");
}

async function aplicarEdicion(
  ctx: ContextoEdicion,
  formData: FormData
): Promise<EstadoVenta> {
  const id = String(formData.get("id") ?? "");

  const parsed = ventaSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { errores: z.flattenError(parsed.error).fieldErrors };
  }

  const venta = await db.venta.findFirst({ where: { id, ...ctx.alcance } });
  if (!venta) return { error: "No se encontró la venta." };

  // Una venta anulada no se corrige: primero se reactiva. Editarla dejaria el
  // historial contando cambios sobre algo que el sistema da por dado de baja.
  if (venta.estado === "ANULADA") {
    return { error: "La venta está anulada. Hay que reactivarla antes de editarla." };
  }

  const plan = await db.plan.findFirst({
    where: { id: parsed.data.planId },
    select: { id: true, codigoProducto: true, activo: true },
  });

  // Un plan dado de baja no se puede elegir, pero si conservar: corregirle el
  // telefono a una venta vieja no tiene por que obligar a cambiarle el plan.
  // Es la unica diferencia con el alta, donde el plan siempre tiene que estar
  // activo.
  if (!plan || (!plan.activo && plan.id !== venta.planId)) {
    return { errores: { planId: ["Ese plan ya no está disponible."] } };
  }

  const nuevos: Record<string, unknown> = {
    nombreCliente: parsed.data.nombreCliente,
    dni: parsed.data.dni,
    telefono: parsed.data.telefono,
    direccion: parsed.data.direccion,
    nroSuscripcion: parsed.data.nroSuscripcion,
    numeroTitulo: parsed.data.numeroTitulo,
    observacion: parsed.data.observacion,
    planId: plan.id,
    codigoProducto: plan.codigoProducto,
  };

  // Se guarda el diff campo por campo, no la fila entera: el historial tiene
  // que dejar ver que cambio exactamente y contra que valor.
  const cambios: Record<string, { antes: ValorHistorial; despues: ValorHistorial }> = {};
  for (const campo of CAMPOS_HISTORIAL) {
    const antes = aValor((venta as Record<string, unknown>)[campo]);
    const despues = aValor(nuevos[campo]);
    if (antes !== despues) cambios[campo] = { antes, despues };
  }

  const contrato = await validarArchivo(formData.get("adjuntoContrato"), "Contrato");
  if (contrato.error) return { error: contrato.error };

  const dni = await validarArchivo(formData.get("adjuntoDni"), "Foto del DNI");
  if (dni.error) return { error: dni.error };

  const nuevosAdjuntos: { tipo: AdjuntoTipo; archivo: ArchivoValidado }[] = [];
  if (dni.archivo) nuevosAdjuntos.push({ tipo: "DNI", archivo: dni.archivo });
  if (contrato.archivo) nuevosAdjuntos.push({ tipo: "CONTRATO", archivo: contrato.archivo });

  // Solo estos hacen falta para el `update`; los adjuntos que siguen entran al
  // diff pero no son columnas de la venta.
  const hayCamposCambiados = Object.keys(cambios).length > 0;

  // Subir la foto del DNI una semana despues es la edicion mas comun que hay
  // —la foto es opcional justamente para poder cargar la venta desde la calle—
  // y sin esto no dejaba rastro en ningun lado: ni en el historial de la ficha
  // ni en el feed.
  for (const { tipo } of nuevosAdjuntos) {
    cambios[tipo === "DNI" ? "adjuntoDni" : "adjuntoContrato"] = {
      antes: null,
      despues: "archivo adjuntado",
    };
  }

  if (!hayCamposCambiados && nuevosAdjuntos.length === 0) {
    redirect(ctx.destino(venta.id));
  }

  const rutas: string[] = [];
  try {
    const guardados = await Promise.all(
      nuevosAdjuntos.map(async ({ tipo, archivo }) => {
        const path = await guardarAdjunto(archivo.contenido, archivo.mimeType);
        rutas.push(path);
        return { tipo, path, mimeType: archivo.mimeType, size: archivo.size };
      })
    );

    await db.$transaction(async (tx) => {
      if (hayCamposCambiados) {
        await tx.venta.update({ where: { id: venta.id }, data: nuevos });
      }

      await tx.ventaHistorial.create({
        data: { ventaId: venta.id, cambios, modificadoPorUserId: ctx.userId },
      });

      // La misma copia del diff en el feed. Es duplicacion deliberada: sin
      // ella la Actividad tendria que hacer un join distinto por cada tipo de
      // evento para dibujar un renglon.
      await registrarActividad(tx, {
        tipo: "VENTA_EDICION",
        zonaId: venta.zonaId,
        vendedorId: venta.vendedorId,
        ventaId: venta.id,
        detalle: venta.nombreCliente,
        cambios,
        actorUserId: ctx.userId,
      });

      for (const adjunto of guardados) {
        await tx.ventaAdjunto.create({
          data: { ...adjunto, ventaId: venta.id, subidoPorUserId: ctx.userId },
        });
      }
    });
  } catch (error) {
    await Promise.all(rutas.map(borrarAdjunto));
    throw error;
  }

  revalidarVenta(venta.id);
  redirect(ctx.destino(venta.id));
}

export async function editarVenta(
  _previo: EstadoVenta,
  formData: FormData
): Promise<EstadoVenta> {
  const usuario = await requirePermiso("cargarVentas");

  return aplicarEdicion(
    {
      userId: usuario.id,
      alcance: { vendedorId: usuario.vendedorId },
      destino: (id) => `/vendedor/ventas/${id}`,
    },
    formData
  );
}

/**
 * Edicion desde /admin. Es la misma que la del vendedor —Lisandro fue explicito
 * en que el admin no pierde ninguna opcion— cambiando de que depende el
 * alcance: el vendedor tiene las suyas, Balta las de la zona que este mirando.
 */
export async function editarVentaComoAdmin(
  _previo: EstadoVenta,
  formData: FormData
): Promise<EstadoVenta> {
  const usuario = await requireAdmin();
  const zonaId = await requireZonaActivaId();

  return aplicarEdicion(
    { userId: usuario.id, alcance: { zonaId }, destino: (id) => `/admin/ventas/${id}` },
    formData
  );
}

// ---------------------------------------------------------------------------
// Anulacion
//
// Anular no borra: marca. La venta se sigue viendo —atenuada— en los dos
// listados, conserva sus adjuntos y su historial, y se puede reactivar. Borrar
// la fila perderia la foto del DNI, el historial de cambios y hasta el hecho de
// que la venta existio.
//
// No toca ninguna comision: el calculo sale del padron (`TituloCuota`) y no de
// `Venta`. Anular una venta no le saca un peso a nadie, y eso se dice en el
// cuadro de confirmacion para que nadie lo suponga al reves.
//
// Es una accion de admin. El pedido de "las mismas opciones" era sobre editar;
// anular es de otra naturaleza y quedo asentado como supuesto en el plan.
// ---------------------------------------------------------------------------

export async function anularVenta(
  _previo: EstadoVenta,
  formData: FormData
): Promise<EstadoVenta> {
  const usuario = await requireAdmin();
  const zonaId = await requireZonaActivaId();

  const id = String(formData.get("id") ?? "");
  const parsed = anulacionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { errores: z.flattenError(parsed.error).fieldErrors };
  }

  const venta = await db.venta.findFirst({
    where: { id, zonaId },
    select: { id: true, estado: true, vendedorId: true, nombreCliente: true },
  });
  if (!venta) return { error: "No se encontró la venta." };
  if (venta.estado === "ANULADA") redirect(`/admin/ventas/${venta.id}`);

  const cambios = {
    estado: { antes: "activa", despues: "anulada" },
    motivoAnulacion: { antes: null, despues: parsed.data.motivo },
  };

  await db.$transaction(async (tx) => {
    await tx.venta.update({
      where: { id: venta.id },
      data: {
        estado: "ANULADA",
        anuladaAt: new Date(),
        anuladaPorUserId: usuario.id,
        motivoAnulacion: parsed.data.motivo,
      },
    });

    // El motivo va ademas al historial porque al reactivar se limpia de la
    // venta: sin esto, una venta anulada y reactivada no dejaria rastro de por
    // que se habia anulado.
    await tx.ventaHistorial.create({
      data: { ventaId: venta.id, cambios, modificadoPorUserId: usuario.id },
    });

    await registrarActividad(tx, {
      tipo: "VENTA_ANULACION",
      zonaId,
      vendedorId: venta.vendedorId,
      ventaId: venta.id,
      detalle: venta.nombreCliente,
      cambios,
      actorUserId: usuario.id,
    });
  });

  revalidarVenta(venta.id);
  redirect(`/admin/ventas/${venta.id}`);
}

/**
 * La vuelta atras de anular. No estaba en el pedido, pero anular sin salida
 * convertiria un click equivocado en un dato irrecuperable; el sistema ya trata
 * asi a los periodos de comision, que se cierran y se pueden reabrir.
 */
export async function reactivarVenta(
  _previo: EstadoVenta,
  formData: FormData
): Promise<EstadoVenta> {
  const usuario = await requireAdmin();
  const zonaId = await requireZonaActivaId();

  const id = String(formData.get("id") ?? "");
  const venta = await db.venta.findFirst({
    where: { id, zonaId },
    select: { id: true, estado: true, vendedorId: true, nombreCliente: true },
  });
  if (!venta) return { error: "No se encontró la venta." };
  if (venta.estado === "ACTIVA") redirect(`/admin/ventas/${venta.id}`);

  const cambios = { estado: { antes: "anulada", despues: "activa" } };

  await db.$transaction(async (tx) => {
    await tx.venta.update({
      where: { id: venta.id },
      data: {
        estado: "ACTIVA",
        anuladaAt: null,
        anuladaPorUserId: null,
        motivoAnulacion: null,
      },
    });

    await tx.ventaHistorial.create({
      data: { ventaId: venta.id, cambios, modificadoPorUserId: usuario.id },
    });

    // Reactivar no estaba previsto en el feed, pero sin el se ven anulaciones
    // de ventas que despues aparecen activas y no se entiende por que.
    await registrarActividad(tx, {
      tipo: "VENTA_REACTIVACION",
      zonaId,
      vendedorId: venta.vendedorId,
      ventaId: venta.id,
      detalle: venta.nombreCliente,
      cambios,
      actorUserId: usuario.id,
    });
  });

  revalidarVenta(venta.id);
  redirect(`/admin/ventas/${venta.id}`);
}
