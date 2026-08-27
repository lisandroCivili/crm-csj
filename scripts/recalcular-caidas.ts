/**
 * RECALCULO DE CAIDAS.
 *
 *   npx tsx scripts/recalcular-caidas.ts [SALTA|TUCUMAN]
 *
 * Sin zona, recorre las dos.
 *
 * El estado de caida de cada titulo lo mantiene al dia la importacion del
 * padron, pero solo para los titulos que ese archivo trae. Este script es para
 * la primera pasada sobre datos que ya estaban cargados —despues de aplicar la
 * migracion, todos los titulos quedan como "sin datos suficientes" hasta que se
 * lo corra— y para rehacer el calculo si alguna vez cambia la regla.
 *
 * No escribe nada nuevo: usa la misma funcion que la importacion
 * (`lib/padron/recalcularCaidas.ts`), asi que correrlo dos veces no cambia
 * nada. Es seguro contra la base de produccion.
 */
import "dotenv/config";
import { db } from "../lib/db";
import { recalcularCaidas } from "../lib/padron/recalcularCaidas";
import { IMPAGAS_PARA_CAIDA } from "../lib/padron/caidas";
import type { ZonaNombre } from "../lib/generated/prisma/client";

const ZONAS: ZonaNombre[] = ["SALTA", "TUCUMAN"];

async function main() {
  const pedida = process.argv[2]?.toUpperCase();

  if (pedida && !ZONAS.includes(pedida as ZonaNombre)) {
    console.error(`Zona desconocida: ${pedida}. Usar SALTA o TUCUMAN.`);
    process.exit(1);
  }

  const zonas = await db.zona.findMany({
    where: pedida ? { nombre: pedida as ZonaNombre } : {},
    orderBy: { nombre: "asc" },
  });

  console.log(`Un titulo se da por caido con ${IMPAGAS_PARA_CAIDA} cuotas impagas seguidas.\n`);

  for (const zona of zonas) {
    const titulos = await db.titulo.findMany({
      where: { zonaId: zona.id },
      select: { id: true },
    });

    if (titulos.length === 0) {
      console.log(`${zona.nombre}: sin titulos cargados.`);
      continue;
    }

    const arranque = Date.now();
    const resumen = await recalcularCaidas(
      db,
      titulos.map((titulo) => titulo.id)
    );
    const segundos = ((Date.now() - arranque) / 1000).toFixed(1);

    console.log(`${zona.nombre}: ${resumen.titulosRevisados} titulos en ${segundos}s`);
    console.log(`  caidos:          ${resumen.caidos}`);
    console.log(`  sin datos:       ${resumen.sinDatos}`);
    console.log(`  se actualizaron: ${resumen.titulosActualizados}`);
  }

  await db.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await db.$disconnect();
  process.exit(1);
});
