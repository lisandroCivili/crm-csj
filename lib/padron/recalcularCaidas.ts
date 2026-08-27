import type { Prisma } from "@/lib/generated/prisma/client";
import { calcularEstadoCaida } from "./caidas";

/**
 * Guarda en `Titulo` el estado de caida que calcula `lib/padron/caidas.ts`.
 *
 * Vive aparte del calculo porque tiene otro trabajo: leer el historico en
 * tandas, comparar contra lo guardado y escribir solo lo que cambio. Lo usan
 * los dos caminos que pueden mover el estado —la importacion de un padron y
 * `scripts/recalcular-caidas.ts`—, para que no haya dos versiones de la regla.
 *
 * El estado se guarda en vez de calcularse al vuelo porque el listado de
 * clientes filtra y cuenta por el: hacerlo en memoria obligaria a traer el
 * historico entero de la zona en cada visita.
 */

/** Acepta `db` o el `tx` de una transaccion. */
type ClientePrisma = Prisma.TransactionClient;

/** Cuantos titulos se piden por vez. Cada uno trae su historico completo. */
const TANDA_LECTURA = 300;
/** Cuantos updates se mandan en paralelo. */
const TANDA_ESCRITURA = 100;

export type ResumenRecalculo = {
  titulosRevisados: number;
  titulosActualizados: number;
  /** Cuantos quedaron caidos, en total (no cuantos se cayeron ahora). */
  caidos: number;
  /** Cuantos no tienen historico suficiente para afirmar nada. */
  sinDatos: number;
};

function enTandas<T>(items: T[], tamanio: number): T[][] {
  const tandas: T[][] = [];
  for (let i = 0; i < items.length; i += tamanio) {
    tandas.push(items.slice(i, i + tamanio));
  }
  return tandas;
}

export async function recalcularCaidas(
  cliente: ClientePrisma,
  tituloIds: string[],
  ahora: Date = new Date()
): Promise<ResumenRecalculo> {
  const resumen: ResumenRecalculo = {
    titulosRevisados: 0,
    titulosActualizados: 0,
    caidos: 0,
    sinDatos: 0,
  };

  if (tituloIds.length === 0) return resumen;

  const aActualizar: { id: string; datos: Prisma.TituloUpdateInput }[] = [];

  for (const tanda of enTandas(tituloIds, TANDA_LECTURA)) {
    const titulos = await cliente.titulo.findMany({
      where: { id: { in: tanda } },
      select: {
        id: true,
        impagasConsecutivas: true,
        cuotaUltimaPaga: true,
        cuotaMinConocida: true,
        cuotaMaxConocida: true,
        caidoAt: true,
        caidaConfiable: true,
        cuotas: { select: { numeroCuota: true, fechaPago: true } },
      },
    });

    for (const titulo of titulos) {
      resumen.titulosRevisados++;

      const estado = calcularEstadoCaida(
        titulo.cuotas.map((cuota) => ({
          numeroCuota: cuota.numeroCuota,
          pagada: cuota.fechaPago !== null,
        }))
      );

      if (estado.caido) resumen.caidos++;
      if (!estado.confiable) resumen.sinDatos++;

      // La fecha de caida se sella la primera vez y se conserva mientras siga
      // caido: sirve para saber desde cuando. Si el cliente se pone al dia, se
      // borra, porque el titulo dejo de estar caido de verdad.
      const caidoAt = estado.caido ? (titulo.caidoAt ?? ahora) : null;

      const cambio =
        titulo.impagasConsecutivas !== estado.impagasConsecutivas ||
        titulo.cuotaUltimaPaga !== estado.cuotaUltimaPaga ||
        titulo.cuotaMinConocida !== estado.cuotaMinConocida ||
        titulo.cuotaMaxConocida !== estado.cuotaMaxConocida ||
        titulo.caidaConfiable !== estado.confiable ||
        titulo.caidoAt?.getTime() !== caidoAt?.getTime();

      if (!cambio) continue;

      aActualizar.push({
        id: titulo.id,
        datos: {
          impagasConsecutivas: estado.impagasConsecutivas,
          cuotaUltimaPaga: estado.cuotaUltimaPaga,
          cuotaMinConocida: estado.cuotaMinConocida,
          cuotaMaxConocida: estado.cuotaMaxConocida,
          caidaConfiable: estado.confiable,
          caidoAt,
        },
      });
    }
  }

  for (const tanda of enTandas(aActualizar, TANDA_ESCRITURA)) {
    await Promise.all(
      tanda.map((titulo) =>
        cliente.titulo.update({ where: { id: titulo.id }, data: titulo.datos })
      )
    );
  }

  resumen.titulosActualizados = aActualizar.length;
  return resumen;
}
