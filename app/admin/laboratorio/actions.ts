"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin, requireZonaActivaId } from "@/lib/sesion";

/**
 * Herramientas de desarrollo. Borran datos de verdad y no tienen vuelta atras,
 * asi que no existen fuera de desarrollo.
 *
 * El chequeo esta en la accion y no solo en la pagina a proposito: una server
 * action es un endpoint que se puede invocar sin pasar por la pantalla. Si el
 * corte viviera nada mas en el componente, la accion seguiria ahi.
 */
function soloEnDesarrollo() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Las herramientas de laboratorio no existen en producción.");
  }
}

export type ResultadoVaciado = {
  ok?: boolean;
  error?: string;
  borrados?: {
    cuotas: number;
    titulos: number;
    clientes: number;
    importaciones: number;
  };
};

/**
 * Vacia los datos que entran por el padron en la zona activa: clientes,
 * titulos, cuotas e importaciones.
 *
 * No toca vendedores, alias, escalas, usuarios, leads ni ventas. Recrear el
 * equipo y la escala en cada prueba seria un trabajo inutil, y los alias son
 * justamente lo que hace falta para volver a importar.
 */
export async function vaciarPadron(
  _previo: ResultadoVaciado,
  formData: FormData
): Promise<ResultadoVaciado> {
  soloEnDesarrollo();
  await requireAdmin();
  const zonaId = await requireZonaActivaId();

  // Se escribe el nombre de la zona para confirmar: es la misma idea que pedir
  // el nombre del repo antes de borrarlo. Evita el clic distraido.
  const confirmacion = String(formData.get("confirmacion") ?? "").trim();
  const zona = await db.zona.findUniqueOrThrow({
    where: { id: zonaId },
    select: { nombre: true },
  });

  if (confirmacion.toUpperCase() !== zona.nombre) {
    return { error: `Para confirmar hay que escribir ${zona.nombre}.` };
  }

  const titulos = await db.titulo.findMany({ where: { zonaId }, select: { id: true } });
  const ids = titulos.map((t) => t.id);

  // En orden de dependencia. Las cuotas se borran solas por el cascade de
  // Titulo, pero se hace explicito para poder contarlas.
  const { count: cuotas } = await db.tituloCuota.deleteMany({
    where: { tituloId: { in: ids } },
  });
  const { count: titulosBorrados } = await db.titulo.deleteMany({ where: { zonaId } });
  const { count: clientes } = await db.cliente.deleteMany({ where: { zonaId } });
  const { count: importaciones } = await db.padronImport.deleteMany({ where: { zonaId } });

  revalidatePath("/admin/laboratorio");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/clientes");
  revalidatePath("/admin/padron");
  revalidatePath("/admin/comisiones");

  return {
    ok: true,
    borrados: { cuotas, titulos: titulosBorrados, clientes, importaciones },
  };
}

/**
 * Deja creados los dos vendedores de los padrones de prueba, con sus alias ya
 * vinculados. Sin los alias la importacion se planta: no se importa un padron
 * con nombres de vendedor sin mapear, porque imputarle cuotas al vendedor
 * equivocado corrompe la comision.
 */
export async function crearVendedoresDePrueba(): Promise<ResultadoVaciado> {
  soloEnDesarrollo();
  await requireAdmin();
  const zonaId = await requireZonaActivaId();

  const definiciones = [
    { nomVen: "PRUEBA VENDEDOR UNO", codigo: "PRUEBA-UNO", dni: "99990101", tope: 4 },
    { nomVen: "PRUEBA VENDEDOR DOS", codigo: "PRUEBA-DOS", dni: "99990102", tope: 5 },
  ];

  for (const d of definiciones) {
    const vendedor = await db.vendedor.upsert({
      where: { zonaId_codigo: { zonaId, codigo: d.codigo } },
      update: { activo: true, topeCuotasComision: d.tope },
      create: {
        nombreCompleto: d.nomVen,
        dni: d.dni,
        codigo: d.codigo,
        zonaId,
        topeCuotasComision: d.tope,
      },
      select: { id: true },
    });

    await db.vendedorAlias.upsert({
      where: { nomVenPadron: d.nomVen },
      update: { vendedorId: vendedor.id },
      create: { nomVenPadron: d.nomVen, vendedorId: vendedor.id },
    });
  }

  revalidatePath("/admin/laboratorio");
  revalidatePath("/admin/vendedores");
  return { ok: true };
}

/**
 * Carga una escala completa de c1 a c5 para poder ver comisiones distintas de
 * cero. Sin esto, las cuotas sin porcentaje liquidan en cero y la pantalla de
 * comisiones no dice nada util.
 *
 * Reemplaza los tramos de la escala predeterminada (la crea si todavia no
 * existe ninguna): si Balta tenia algo cargado ahi a mano, se pierde. Por eso
 * vive aca y no en la pantalla de escalas. Las demas escalas no se tocan.
 */
export async function cargarEscalaDeEjemplo(): Promise<ResultadoVaciado> {
  soloEnDesarrollo();
  await requireAdmin();

  // Dos tramos, para que se note el salto al vender mas. El que arranca en 0
  // tiene que existir siempre: es el que cobra el vendedor que no vendio nada
  // ese mes pero si cobro cuotas viejas.
  const TRAMOS = [
    { ventasMin: 0, ventasMax: 2, porcentajes: [20, 15, 10, 5, 2] },
    { ventasMin: 3, ventasMax: null, porcentajes: [25, 20, 15, 10, 5] },
  ];

  await db.$transaction(async (tx) => {
    const predeterminada =
      (await tx.escala.findFirst({ where: { esPredeterminada: true }, select: { id: true } })) ??
      (await tx.escala.create({
        data: { nombre: "General", esPredeterminada: true },
        select: { id: true },
      }));

    await tx.escalaComision.deleteMany({ where: { escalaId: predeterminada.id } });
    for (const tramo of TRAMOS) {
      for (const [indice, porcentaje] of tramo.porcentajes.entries()) {
        await tx.escalaComision.create({
          data: {
            escalaId: predeterminada.id,
            ventasMin: tramo.ventasMin,
            ventasMax: tramo.ventasMax,
            numeroCuota: indice + 1,
            porcentaje,
          },
        });
      }
    }
  });

  revalidatePath("/admin/laboratorio");
  revalidatePath("/admin/comisiones");
  revalidatePath("/admin/comisiones/escalas");
  return { ok: true };
}
