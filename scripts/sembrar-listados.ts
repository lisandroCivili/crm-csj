/**
 * LLENA MIS LEADS Y MIS VENTAS PARA PODER VER LA PAGINACION. Solo desarrollo.
 *
 *   npx tsx scripts/sembrar-listados.ts
 *   npx tsx scripts/sembrar-listados.ts --borrar
 *
 * POR QUE ES UN SCRIPT APARTE Y NO PARTE DE `sembrar-demo.ts`
 *
 * Porque el escenario de Salta es la referencia de todas las guias de prueba ya
 * validadas —8 clientes, 9 titulos, 69 cuotas, $105.000— y sembrarle leads y
 * ventas le cambiaria dos tarjetas del dashboard del vendedor y el listado de
 * ventas del admin. Esto se corre cuando hace falta ver un listado largo, y se
 * borra cuando termina.
 *
 * Los 55 leads son a proposito: `POR_PAGINA` es 50, asi que con 50 no habria
 * segunda pagina y no se veria justamente lo que se vino a probar.
 *
 * Todo lo que crea queda marcado: los leads empiezan con `PRUEBA-QA` y las
 * ventas llevan `codigoProducto: "PRUEBA-PLAN"` y DNI `9999*`. El `--borrar`
 * busca por esas marcas, asi que no toca nada real ni el escenario de demo.
 */
import "dotenv/config";
import { db } from "../lib/db";

const MARCA_LEAD = "PRUEBA-QA";
const MARCA_VENTA = "PRUEBA-PLAN";
const CUANTOS_LEADS = 55;

const APELLIDOS = [
  "GONZALEZ", "RODRIGUEZ", "GOMEZ", "FERNANDEZ", "LOPEZ", "DIAZ", "MARTINEZ",
  "PEREZ", "SOSA", "ROMERO", "ALVAREZ", "TORRES", "RUIZ", "RAMIREZ", "FLORES",
];
const NOMBRES = [
  "MARIA", "JUAN", "ANA", "CARLOS", "LUCIA", "JORGE", "SOFIA", "MIGUEL",
  "VALERIA", "PABLO", "ROSA", "DIEGO",
];

async function fichaDelVendedorDemo() {
  const ficha = await db.vendedor.findFirst({
    where: { user: { email: "vendedor@crm-csj.local" } },
    select: { id: true, zonaId: true, nombreCompleto: true },
  });
  if (!ficha) {
    console.error(
      "\nFalta la cuenta de vendedor. Antes de esto:\n\n  npx tsx scripts/sembrar-demo.ts\n"
    );
    process.exitCode = 1;
    return null;
  }
  return ficha;
}

async function borrar() {
  const leads = await db.lead.findMany({
    where: { nombre: { startsWith: MARCA_LEAD } },
    select: { id: true },
  });
  const ids = leads.map((l) => l.id);
  // La actividad primero: `Actividad.leadId` es una FK sin cascade.
  await db.actividad.deleteMany({ where: { leadId: { in: ids } } });
  await db.lead.deleteMany({ where: { id: { in: ids } } });
  const ventas = await db.venta.deleteMany({ where: { codigoProducto: MARCA_VENTA } });
  console.log(`\nBorrados ${ids.length} leads y ${ventas.count} ventas de prueba.\n`);
}

async function sembrar() {
  const ficha = await fichaDelVendedorDemo();
  if (!ficha) return;

  const yaHay = await db.lead.count({ where: { nombre: { startsWith: MARCA_LEAD } } });
  if (yaHay > 0) {
    console.log(`\nYa hay ${yaHay} leads de prueba. Se borran y se vuelven a crear.`);
    await borrar();
  }

  for (let i = 1; i <= CUANTOS_LEADS; i++) {
    const nombre = `${MARCA_LEAD} ${NOMBRES[i % NOMBRES.length]} ${APELLIDOS[i % APELLIDOS.length]}`;
    await db.lead.create({
      data: {
        // El indice va en el nombre para que los 55 se distingan entre si: con
        // doce nombres y quince apellidos se repiten.
        nombre: `${nombre} ${String(i).padStart(3, "0")}`,
        telefono: `38740${String(i).padStart(5, "0")}`,
        localidad: i % 2 === 0 ? "SALTA CAPITAL" : "SAN RAMON DE LA NUEVA ORAN",
        provincia: "SALTA",
        origen: i % 4 === 0 ? "CLUB" : "PROPIO",
        estado: i % 3 === 0 ? "VENDIDO" : i % 7 === 0 ? "NO_VENDIDO" : "PENDIENTE",
        zonaId: ficha.zonaId,
        vendedorAsignadoId: ficha.id,
        fechaAsignacion: new Date(),
      },
    });
  }

  // Tres ventas: dos activas y una anulada, que es lo minimo para que los tres
  // chips del filtro tengan algo distinto que contar.
  const ventas = [
    { nombre: "PRUEBA-QA MARIA GONZALEZ", estado: "ACTIVA" as const, dni: "99990001" },
    { nombre: "PRUEBA-QA JORGE FERNANDEZ", estado: "ACTIVA" as const, dni: "99990002" },
    { nombre: "PRUEBA-QA LAURA SOSA", estado: "ANULADA" as const, dni: "99990003" },
  ];
  for (const v of ventas) {
    await db.venta.create({
      data: {
        vendedorId: ficha.id,
        zonaId: ficha.zonaId,
        nombreCliente: v.nombre,
        dni: v.dni,
        telefono: "3874000000",
        codigoProducto: MARCA_VENTA,
        nroSuscripcion: `9999${v.dni.slice(-2)}`,
        observacion: "dato de prueba",
        estado: v.estado,
        ...(v.estado === "ANULADA"
          ? { anuladaAt: new Date(), motivoAnulacion: "dato de prueba" }
          : {}),
      },
    });
  }

  console.log(
    `\n${CUANTOS_LEADS} leads y ${ventas.length} ventas de prueba para ` +
      `${ficha.nombreCompleto}.\n\n` +
      "  Mis leads: 2 páginas (50 + 5)\n" +
      "  Mis ventas: 3, una anulada\n\n" +
      "Se borran con:\n\n  npx tsx scripts/sembrar-listados.ts --borrar\n"
  );
}

async function main() {
  if (process.argv.includes("--borrar")) await borrar();
  else await sembrar();
  await db.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await db.$disconnect().catch(() => {});
  process.exit(1);
});
