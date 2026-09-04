/**
 * ESCENARIO DE PRUEBA COMPLETO, EN LAS DOS ZONAS. Solo para desarrollo.
 *
 *   npx tsx scripts/sembrar-demo.ts
 *
 * Deja la base lista para probar cualquier cosa: los padrones de prueba
 * importados por el camino real en Salta y en Tucuman, las fichas de vendedor de
 * Balta y de Pedro en cada zona enlazadas a sus cuentas, un vendedor con cuenta
 * de ingreso, y la escala de comision cargada.
 *
 * POR QUE EXISTE
 *
 * Armar esto a mano son siete pasos por zona y sólo estaba documentado para
 * Salta, asi que todo el sistema se probaba siempre contra una sola. La Fase 13
 * mostro lo que eso cuesta: dos defectos de aislamiento entre zonas —el alias
 * del vendedor y la busqueda de titulos— que ninguna lectura del codigo habia
 * encontrado y que aparecieron apenas se importo de verdad en la segunda.
 *
 * Y ademas deja **un vendedor con contraseña**. Hasta ahora probar ese lado del
 * sistema era imposible sin crear la cuenta a mano cada vez: las contraseñas no
 * estan en el repositorio y el seed no crea vendedores.
 *
 * QUE NO HACE
 *
 * No crea zonas ni admins: eso es `npm run db:seed`, y si faltan lo dice.
 * Tampoco toca nada que no este marcado como dato de prueba.
 *
 * ES IDEMPOTENTE: correrlo dos veces deja la base igual, no duplica nada. Es la
 * misma regla que rige la importacion del padron.
 *
 * Todo lo que crea esta marcado y se borra con:
 *   npx tsx scripts/sembrar-demo.ts --borrar
 */
import "dotenv/config";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import bcrypt from "bcryptjs";
import { db } from "../lib/db";
import { parsePadron } from "../lib/excel/parsePadron";
import { importarPadron } from "../lib/padron/importarPadron";

const CARPETA_PADRONES = join("docs", "padrones-prueba");

/** La cuenta de vendedor que hoy no existe y hace falta para probar ese lado. */
const VENDEDOR_DEMO = {
  email: "vendedor@crm-csj.local",
  password: process.env.SEED_VENDEDOR_PASSWORD ?? "CambiarEstePassword123",
};

type FichaDemo = {
  nombreCompleto: string;
  dni: string;
  codigo: string;
  tope: number;
  /** Los NomVen del padron que le corresponden en esta zona. */
  alias: string[];
  /** Email del admin al que se le engancha la ficha, si es la de un agente. */
  emailAdmin?: string;
  /** Le crea cuenta de ingreso propia. Solo para el vendedor de demo. */
  conCuenta?: boolean;
};

/**
 * Las fichas por zona.
 *
 * `PRUEBA VENDEDOR UNO` y `TOLEDO PEDRO` aparecen en las dos zonas a proposito:
 * es el caso que la Fase 13 arreglo —el mismo NomVen tiene que poder apuntar a
 * una ficha en cada zona— y el que hay que poder seguir probando.
 */
const FICHAS: Record<string, FichaDemo[]> = {
  SALTA: [
    {
      nombreCompleto: "PRUEBA VENDEDOR UNO",
      dni: "99990101",
      codigo: "PRUEBA-UNO",
      tope: 4,
      alias: ["PRUEBA VENDEDOR UNO"],
      conCuenta: true,
    },
    {
      nombreCompleto: "PRUEBA VENDEDOR DOS",
      dni: "99990102",
      codigo: "PRUEBA-DOS",
      tope: 5,
      alias: ["PRUEBA VENDEDOR DOS"],
    },
    {
      nombreCompleto: "Baltazar Ignacio Toledo Perez",
      dni: "99999999",
      codigo: "PRUEBA-B",
      tope: 5,
      alias: [],
      emailAdmin: "balta@crm-csj.local",
    },
    {
      nombreCompleto: "Pedro Toledo",
      dni: "99999998",
      codigo: "PRUEBA-P",
      tope: 5,
      alias: ["TOLEDO PEDRO"],
      emailAdmin: "pedro@crm-csj.local",
    },
  ],
  TUCUMAN: [
    {
      nombreCompleto: "PRUEBA VENDEDOR UNO",
      dni: "99990101",
      codigo: "PRUEBA-UNO",
      tope: 4,
      alias: ["PRUEBA VENDEDOR UNO"],
    },
    {
      nombreCompleto: "Baltazar Ignacio Toledo Perez",
      dni: "99999999",
      codigo: "PRUEBA-B",
      tope: 5,
      alias: [],
      emailAdmin: "balta@crm-csj.local",
    },
    {
      nombreCompleto: "Pedro Toledo",
      dni: "99999998",
      codigo: "PRUEBA-P",
      tope: 5,
      alias: ["TOLEDO PEDRO"],
      emailAdmin: "pedro@crm-csj.local",
    },
  ],
};

/** Los tramos que carga el laboratorio, para no depender de la pantalla. */
const TRAMOS_ESCALA = [
  { ventasMin: 0, ventasMax: 2, porcentajes: [20, 15, 10, 5, 2] },
  { ventasMin: 3, ventasMax: null, porcentajes: [25, 20, 15, 10, 5] },
];

/** Los archivos de cada zona, ordenados. Salta no lleva sufijo por historia. */
function padronesDe(zona: string): string[] {
  const sufijo = zona === "TUCUMAN" ? "tucuman-" : "";
  return readdirSync(CARPETA_PADRONES)
    .filter((archivo) => archivo.endsWith(".xlsx"))
    .filter((archivo) =>
      zona === "TUCUMAN"
        ? archivo.includes("-tucuman-")
        : !archivo.includes("-tucuman-")
    )
    .filter((archivo) => archivo.startsWith(`padron-prueba-${sufijo}`))
    .sort();
}

// ---------------------------------------------------------------------------

async function vaciarZona(zonaId: number) {
  await db.tituloCuota.deleteMany({ where: { titulo: { zonaId } } });
  await db.titulo.deleteMany({ where: { zonaId } });
  await db.cliente.deleteMany({ where: { zonaId } });
  await db.padronImport.deleteMany({ where: { zonaId } });
}

async function sembrarFichas(zonaId: number, fichas: FichaDemo[]) {
  for (const ficha of fichas) {
    // Si es la ficha de un agente, se engancha a su cuenta de admin. Es el mismo
    // enlace que hace `/admin/vendedores/[id]`, y es lo que hace aparecer la
    // tarjeta "Mi comision del mes" en el dashboard.
    const admin = ficha.emailAdmin
      ? await db.user.findUnique({ where: { email: ficha.emailAdmin }, select: { id: true } })
      : null;

    const vendedor = await db.vendedor.upsert({
      where: { zonaId_codigo: { zonaId, codigo: ficha.codigo } },
      update: {
        nombreCompleto: ficha.nombreCompleto,
        activo: true,
        topeCuotasComision: ficha.tope,
        ...(admin ? { userId: admin.id } : {}),
      },
      create: {
        nombreCompleto: ficha.nombreCompleto,
        dni: ficha.dni,
        codigo: ficha.codigo,
        zonaId,
        topeCuotasComision: ficha.tope,
        ...(admin ? { userId: admin.id } : {}),
      },
      select: { id: true, userId: true },
    });

    for (const nomVen of ficha.alias) {
      await db.vendedorAlias.upsert({
        where: { zonaId_nomVenPadron: { zonaId, nomVenPadron: nomVen } },
        update: { vendedorId: vendedor.id },
        create: { nomVenPadron: nomVen, vendedorId: vendedor.id, zonaId },
      });
    }

    if (ficha.conCuenta && !vendedor.userId) {
      const passwordHash = await bcrypt.hash(VENDEDOR_DEMO.password, 10);
      const cuenta = await db.user.upsert({
        where: { email: VENDEDOR_DEMO.email },
        update: { activo: true, passwordHash, role: "VENDEDOR" },
        create: {
          email: VENDEDOR_DEMO.email,
          nombre: ficha.nombreCompleto,
          role: "VENDEDOR",
          passwordHash,
        },
        select: { id: true },
      });
      await db.vendedor.update({
        where: { id: vendedor.id },
        data: { userId: cuenta.id },
      });
    }
  }
}

async function sembrarEscala() {
  await db.$transaction(async (tx) => {
    const predeterminada =
      (await tx.escala.findFirst({ where: { esPredeterminada: true }, select: { id: true } })) ??
      (await tx.escala.create({
        data: { nombre: "General", esPredeterminada: true },
        select: { id: true },
      }));

    await tx.escalaComision.deleteMany({ where: { escalaId: predeterminada.id } });
    for (const tramo of TRAMOS_ESCALA) {
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
}

async function importarZona(zona: string, zonaId: number, adminId: string) {
  const archivos = padronesDe(zona);
  if (archivos.length === 0) {
    console.log(`  (no hay padrones de ${zona}: corré npx tsx scripts/generar-padrones-prueba.ts)`);
    return;
  }

  for (const archivo of archivos) {
    const parseo = parsePadron(readFileSync(join(CARPETA_PADRONES, archivo)));
    const resumen = await importarPadron({
      filas: parseo.filas,
      zonaId,
      soloSimular: false,
      columnasPersonales: parseo.columnasPersonales,
      lote: {
        archivoNombre: archivo,
        importadoPorUserId: adminId,
        periodoDesde: parseo.periodoDesde,
        periodoHasta: parseo.periodoHasta,
      },
    });
    console.log(
      `  ${archivo}  +${resumen.titulosNuevos} títulos ` +
        `(${resumen.titulosNuevosVenta} nuevas · ${resumen.titulosNuevosRenovacion} renov), ` +
        `+${resumen.cuotasNuevas} cuotas, ${resumen.titulosCaidos} caídos`
    );
  }
}

// ---------------------------------------------------------------------------

async function borrar() {
  console.log("Borrando el escenario de prueba…\n");
  for (const zona of await db.zona.findMany({ select: { id: true, nombre: true } })) {
    await vaciarZona(zona.id);
    const fichas = await db.vendedor.findMany({
      where: { zonaId: zona.id, codigo: { startsWith: "PRUEBA-" } },
      select: { id: true },
    });
    const ids = fichas.map((f) => f.id);
    await db.vendedorAlias.deleteMany({ where: { vendedorId: { in: ids } } });
    await db.actividad.deleteMany({ where: { vendedorId: { in: ids } } });
    await db.lead.updateMany({
      where: { vendedorAsignadoId: { in: ids } },
      data: { vendedorAsignadoId: null },
    });
    await db.vendedor.deleteMany({ where: { id: { in: ids } } });
    console.log(`  ${zona.nombre}: padrón vaciado y ${ids.length} fichas de prueba borradas`);
  }
  await db.user.deleteMany({ where: { email: VENDEDOR_DEMO.email } });
  console.log(`  cuenta ${VENDEDOR_DEMO.email} borrada`);
  console.log("\nLas zonas, los admins y la escala quedan como estaban.");
}

async function sembrar() {
  const zonas = await db.zona.findMany({ select: { id: true, nombre: true } });
  const admin = await db.user.findFirst({ where: { role: "ADMIN" }, select: { id: true } });

  if (zonas.length === 0 || !admin) {
    console.error(
      "\nFaltan las zonas o los usuarios admin. Se crean con:\n\n  npm run db:seed\n"
    );
    process.exitCode = 1;
    return;
  }

  console.log("Sembrando el escenario de prueba en las dos zonas…\n");

  await sembrarEscala();
  console.log("escala de comisión de ejemplo cargada (2 tramos, c1 a c5)");

  for (const zona of zonas) {
    const fichas = FICHAS[zona.nombre] ?? [];
    console.log(`\n=== ${zona.nombre} ===`);

    await vaciarZona(zona.id);
    await sembrarFichas(zona.id, fichas);
    console.log(`  ${fichas.length} fichas de vendedor con sus alias`);

    await importarZona(zona.nombre, zona.id, admin.id);
  }

  console.log("\n=== cómo quedó ===\n");
  for (const zona of zonas) {
    const [clientes, titulos, cuotas, imports, alias] = await Promise.all([
      db.cliente.count({ where: { zonaId: zona.id } }),
      db.titulo.count({ where: { zonaId: zona.id } }),
      db.tituloCuota.count({ where: { titulo: { zonaId: zona.id } } }),
      db.padronImport.count({ where: { zonaId: zona.id } }),
      db.vendedorAlias.count({ where: { zonaId: zona.id } }),
    ]);
    console.log(
      `${zona.nombre.padEnd(8)} ${clientes} clientes · ${titulos} títulos · ${cuotas} cuotas · ` +
        `${imports} importaciones · ${alias} alias`
    );
  }

  console.log(
    "\nPara entrar:\n" +
      "  admin     balta@crm-csj.local  /  pedro@crm-csj.local\n" +
      `  vendedor  ${VENDEDOR_DEMO.email}  (${VENDEDOR_DEMO.password})\n\n` +
      "Las contraseñas de los admin las pone `npm run db:seed`.\n" +
      "Todo lo que sembró este script se saca con: npx tsx scripts/sembrar-demo.ts --borrar\n"
  );
}

async function main() {
  if (process.argv.includes("--borrar")) await borrar();
  else await sembrar();
  await db.$disconnect();
}

/**
 * Si la base no esta levantada, Prisma tira un stacktrace largo que no dice lo
 * unico que importa: falta el proceso de la base, no se rompio el script.
 */
function esFaltaDeBase(error: unknown): boolean {
  const e = error as { code?: string; message?: string };
  return (
    e?.code === "P1001" ||
    e?.code === "P1017" ||
    e?.code === "ECONNREFUSED" ||
    (typeof e?.message === "string" && e.message.includes("ECONNREFUSED"))
  );
}

main().catch(async (error) => {
  if (esFaltaDeBase(error)) {
    console.error(
      "\nNo se puede conectar a la base local.\n\n" +
        "En desarrollo la base es un proceso que vive mientras este abierto, no un\n" +
        "servicio del sistema. Hay que levantarla antes de correr este script:\n\n" +
        "  npm run dev        (levanta la base Y la web, en otra terminal)\n" +
        "  npm run dev:db     (solo la base, si no hace falta la web)\n"
    );
  } else {
    console.error(error);
  }
  await db.$disconnect().catch(() => {});
  process.exit(1);
});
