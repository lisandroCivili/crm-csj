/**
 * DATOS DE PRUEBA AUDITABLES. Solo para desarrollo.
 *
 *   npx tsx scripts/datos-prueba.ts cargar [SALTA|TUCUMAN] [--escala-prueba]
 *   npx tsx scripts/datos-prueba.ts borrar
 *
 * Para que Balta pueda controlar que las comisiones se calculan bien hace falta
 * un juego de datos que se pueda verificar con una calculadora. El padron real
 * tiene 6.878 filas y cuotas de $107.293: no hay forma de auditarlo a mano.
 *
 * Este script arma un escenario chico con importes redondos y despues imprime la
 * cuenta paso a paso. La cuenta se hace ACA, con aritmetica propia: no llama a
 * `calcularComisionPeriodo`. Si usara el motor estaria comparando el motor
 * consigo mismo y no probaria nada. El punto es justamente que dos caminos
 * independientes den el mismo numero.
 *
 * El escenario cubre a proposito los tres casos donde el calculo suele fallar:
 *
 *   - un vendedor SIN ventas nuevas, que igual cobra sus cuotas viejas al tramo
 *     mas bajo (por eso siempre tiene que existir un tramo con ventasMin = 0),
 *   - una cuota que pasa el tope del vendedor y hay que descartar,
 *   - varias cuotas del mismo numero, que se agrupan en un solo renglon.
 *
 * Todo queda marcado como ficticio (DNI 9999xxxx, codigos PRUEBA-*, titulos
 * PRU-*) y se borra con el subcomando `borrar`.
 */
import "dotenv/config";
import { db } from "../lib/db";
import { periodoActual, rangoDelPeriodo } from "../lib/comisiones/periodo";
import type { ZonaNombre } from "../lib/generated/prisma/client";

const MARCA_CODIGO = "PRUEBA-";
const MARCA_TITULO = "PRU-";
const MARCA_DNI = "9999";

const PESOS = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

// ---------------------------------------------------------------------------
// El escenario
// ---------------------------------------------------------------------------

type CuotaPrueba = { numeroCuota: number; importe: number };

type VendedorPrueba = {
  codigo: string;
  nombreCompleto: string;
  dni: string;
  topeCuotasComision: number;
  /** Una cuota cobrada este mes por cada entrada. */
  cuotas: CuotaPrueba[];
};

const VENDEDORES: VendedorPrueba[] = [
  {
    codigo: `${MARCA_CODIGO}GOMEZ`,
    nombreCompleto: "GOMEZ JUAN (prueba)",
    dni: `${MARCA_DNI}0001`,
    topeCuotasComision: 4,
    cuotas: [
      // Dos ventas nuevas: son las que definen el tramo de la escala.
      { numeroCuota: 1, importe: 100_000 },
      { numeroCuota: 1, importe: 100_000 },
      // Una cuota vieja.
      { numeroCuota: 2, importe: 100_000 },
      // Pasa su tope (c4): tiene que quedar afuera del calculo.
      { numeroCuota: 6, importe: 100_000 },
    ],
  },
  {
    codigo: `${MARCA_CODIGO}PEREZ`,
    nombreCompleto: "PEREZ ANA (prueba)",
    dni: `${MARCA_DNI}0002`,
    topeCuotasComision: 5,
    cuotas: [
      // Ninguna venta nueva este mes: cae en el tramo mas bajo pero igual cobra.
      // Las dos cuotas 3 se agrupan en un solo renglon.
      { numeroCuota: 3, importe: 200_000 },
      { numeroCuota: 3, importe: 200_000 },
      { numeroCuota: 5, importe: 200_000 },
    ],
  },
];

/**
 * Escala completa de c1 a c5. Se carga si la base no tiene ninguna, o si se pide
 * `--escala-prueba`. Tiene que existir el tramo que arranca en 0: es el que cobra
 * el vendedor que no vendio nada ese mes pero si cobro cuotas viejas.
 */
const ESCALA_SUGERIDA = [
  { ventasMin: 0, ventasMax: 2, porcentajes: { 1: 20, 2: 15, 3: 10, 4: 5, 5: 2 } },
  { ventasMin: 3, ventasMax: null, porcentajes: { 1: 25, 2: 20, 3: 15, 4: 10, 5: 5 } },
];

// ---------------------------------------------------------------------------
// Carga
// ---------------------------------------------------------------------------

async function cargar(zonaNombre: ZonaNombre, pisarEscala: boolean) {
  const zona = await db.zona.findUniqueOrThrow({ where: { nombre: zonaNombre } });
  const periodo = periodoActual();
  const { desde } = rangoDelPeriodo(periodo);

  // `detectadaPagaAt` es lo que define en que periodo se devenga la cuota. Se
  // sella dentro del mes en curso para que la liquidacion de hoy las tome.
  const detectada = new Date();

  console.log(`Zona ${zonaNombre} · periodo ${periodo}\n`);

  let contadorCliente = 0;

  // --- Escala ---------------------------------------------------------------
  const escalasExistentes = await db.escalaComision.count();

  if (escalasExistentes > 0 && pisarEscala) {
    await db.escalaComision.deleteMany({});
    console.log(`Se borraron las ${escalasExistentes} filas de escala que habia.`);
  }

  if (escalasExistentes === 0 || pisarEscala) {
    for (const tramo of ESCALA_SUGERIDA) {
      for (const [numeroCuota, porcentaje] of Object.entries(tramo.porcentajes)) {
        await db.escalaComision.create({
          data: {
            ventasMin: tramo.ventasMin,
            ventasMax: tramo.ventasMax,
            numeroCuota: Number(numeroCuota),
            porcentaje,
          },
        });
      }
    }
    console.log("Escala de prueba cargada, completa de c1 a c5.");
  } else {
    console.log(`La base ya tenia ${escalasExistentes} filas de escala: se usan esas.`);
    console.log("Para reemplazarla por la de prueba: agregar --escala-prueba.");
  }

  // --- Vendedores, clientes, titulos y cuotas -------------------------------
  for (const v of VENDEDORES) {
    const vendedor = await db.vendedor.upsert({
      where: { zonaId_codigo: { zonaId: zona.id, codigo: v.codigo } },
      update: { topeCuotasComision: v.topeCuotasComision, activo: true },
      create: {
        nombreCompleto: v.nombreCompleto,
        dni: v.dni,
        codigo: v.codigo,
        zonaId: zona.id,
        topeCuotasComision: v.topeCuotasComision,
      },
      select: { id: true },
    });

    for (const [i, cuota] of v.cuotas.entries()) {
      const sufijo = `${v.codigo.replace(MARCA_CODIGO, "")}-${i + 1}`;
      // Contador global: si el DNI se armara con el indice de cada vendedor, el
      // primer cliente de uno chocaria con el primero del otro y compartirian
      // ficha, porque el upsert es por (zonaId, dni).
      const dniCliente = `${MARCA_DNI}${String(++contadorCliente).padStart(4, "0")}`;

      const cliente = await db.cliente.upsert({
        where: { zonaId_dni: { zonaId: zona.id, dni: dniCliente } },
        update: {},
        create: {
          dni: dniCliente,
          nombre: `CLIENTE ${sufijo} (prueba)`,
          zonaId: zona.id,
        },
        select: { id: true },
      });

      const titulo = await db.titulo.upsert({
        where: { numTit: `${MARCA_TITULO}${sufijo}` },
        update: { vendedorId: vendedor.id, clienteId: cliente.id },
        create: {
          numTit: `${MARCA_TITULO}${sufijo}`,
          clienteId: cliente.id,
          vendedorId: vendedor.id,
          zonaId: zona.id,
          vistoEnPadronAt: detectada,
        },
        select: { id: true },
      });

      await db.tituloCuota.upsert({
        where: {
          tituloId_numeroCuota: { tituloId: titulo.id, numeroCuota: cuota.numeroCuota },
        },
        update: {
          importe: cuota.importe,
          fechaPago: desde,
          detectadaPagaAt: detectada,
        },
        create: {
          tituloId: titulo.id,
          numeroCuota: cuota.numeroCuota,
          periodoEmision: desde,
          importe: cuota.importe,
          fechaPago: desde,
          detectadaPagaAt: detectada,
        },
      });
    }
  }

  console.log(`Cargados ${VENDEDORES.length} vendedores de prueba con sus cuotas.\n`);

  await imprimirEsperado(periodo);
}

// ---------------------------------------------------------------------------
// La cuenta, hecha a mano
// ---------------------------------------------------------------------------

async function imprimirEsperado(periodo: string) {
  const filas = await db.escalaComision.findMany({
    orderBy: [{ ventasMin: "asc" }, { numeroCuota: "asc" }],
  });

  if (filas.length === 0) {
    console.log("No hay escala cargada: la liquidacion no va a pagar nada.");
    return;
  }

  linea();
  console.log(`RESULTADO ESPERADO — periodo ${periodo}`);
  console.log("Compara esto contra /admin/comisiones.");
  linea();

  let totalZona = 0;

  for (const v of VENDEDORES) {
    // El tramo lo define la cantidad de cuotas 1 cobradas en el mes.
    const ventasNuevas = v.cuotas.filter((c) => c.numeroCuota === 1).length;

    const tramos = [...new Set(filas.map((f) => f.ventasMin))].sort((a, b) => a - b);
    const pisoAplicable = tramos
      .filter((piso) => {
        const fila = filas.find((f) => f.ventasMin === piso)!;
        return ventasNuevas >= piso && (fila.ventasMax === null || ventasNuevas <= fila.ventasMax);
      })
      .pop();

    console.log(`\n${v.nombreCompleto}  (cobra hasta c${v.topeCuotasComision})`);
    console.log(`  ventas nuevas del mes: ${ventasNuevas}`);

    if (pisoAplicable === undefined) {
      console.log("  ningun tramo de la escala cubre ese volumen: cobraria 0");
      continue;
    }

    const filaTramo = filas.find((f) => f.ventasMin === pisoAplicable)!;
    const techo = filaTramo.ventasMax === null ? "o mas" : `a ${filaTramo.ventasMax}`;
    console.log(`  tramo aplicado: desde ${pisoAplicable} ${techo} ventas`);

    // Agrupadas por numero de cuota, que es como se liquida.
    const porNumero = new Map<number, number[]>();
    const descartadas: CuotaPrueba[] = [];

    for (const cuota of v.cuotas) {
      if (cuota.numeroCuota > v.topeCuotasComision) {
        descartadas.push(cuota);
        continue;
      }
      const lista = porNumero.get(cuota.numeroCuota) ?? [];
      lista.push(cuota.importe);
      porNumero.set(cuota.numeroCuota, lista);
    }

    let totalVendedor = 0;

    for (const numeroCuota of [...porNumero.keys()].sort((a, b) => a - b)) {
      const importes = porNumero.get(numeroCuota)!;
      const base = importes.reduce((s, i) => s + i, 0);
      const porcentaje = Number(
        filas.find((f) => f.ventasMin === pisoAplicable && f.numeroCuota === numeroCuota)
          ?.porcentaje ?? 0
      );
      const monto = Math.round((base * porcentaje) / 100);
      totalVendedor += monto;

      console.log(
        `    c${numeroCuota}: ${importes.length} cuota(s) x ${PESOS.format(importes[0])}` +
          ` = ${PESOS.format(base)} x ${porcentaje}% = ${PESOS.format(monto)}`
      );
    }

    for (const d of descartadas) {
      console.log(
        `    c${d.numeroCuota}: ${PESOS.format(d.importe)} DESCARTADA` +
          ` (pasa el tope c${v.topeCuotasComision})`
      );
    }

    console.log(`  TOTAL ${v.nombreCompleto}: ${PESOS.format(totalVendedor)}`);
    totalZona += totalVendedor;
  }

  linea();
  console.log(`TOTAL DE LA ZONA (solo datos de prueba): ${PESOS.format(totalZona)}`);
  linea();
  console.log(
    "\nOjo: si la base ya tenia otros datos cargados, la pantalla va a mostrar\n" +
      "esos numeros sumados a estos. Para ver solo esto, conviene una base limpia."
  );
}

function linea() {
  console.log("─".repeat(70));
}

// ---------------------------------------------------------------------------
// Borrado
// ---------------------------------------------------------------------------

async function borrar() {
  const vendedores = await db.vendedor.findMany({
    where: { codigo: { startsWith: MARCA_CODIGO } },
    select: { id: true },
  });
  const ids = vendedores.map((v) => v.id);

  const titulos = await db.titulo.findMany({
    where: { numTit: { startsWith: MARCA_TITULO } },
    select: { id: true },
  });
  const idsTitulos = titulos.map((t) => t.id);

  // En orden de dependencia: primero lo que apunta, despues lo apuntado.
  const periodos = await db.comisionPeriodo.findMany({
    where: { vendedorId: { in: ids } },
    select: { id: true },
  });
  await db.comisionDetalle.deleteMany({
    where: { comisionPeriodoId: { in: periodos.map((p) => p.id) } },
  });
  const { count: nPeriodos } = await db.comisionPeriodo.deleteMany({
    where: { vendedorId: { in: ids } },
  });

  const { count: nCuotas } = await db.tituloCuota.deleteMany({
    where: { tituloId: { in: idsTitulos } },
  });
  const { count: nTitulos } = await db.titulo.deleteMany({
    where: { id: { in: idsTitulos } },
  });
  const { count: nClientes } = await db.cliente.deleteMany({
    where: { dni: { startsWith: MARCA_DNI } },
  });
  const { count: nVentas } = await db.venta.deleteMany({
    where: { vendedorId: { in: ids } },
  });
  await db.vendedorAlias.deleteMany({ where: { vendedorId: { in: ids } } });
  const { count: nVendedores } = await db.vendedor.deleteMany({
    where: { id: { in: ids } },
  });

  console.log("Borrado de datos de prueba:");
  console.log(`  vendedores ........ ${nVendedores}`);
  console.log(`  clientes .......... ${nClientes}`);
  console.log(`  titulos ........... ${nTitulos}`);
  console.log(`  cuotas ............ ${nCuotas}`);
  console.log(`  ventas ............ ${nVentas}`);
  console.log(`  periodos comision . ${nPeriodos}`);
  console.log("\nLa escala NO se borra: puede haberla cargado Balta a mano.");
}

// ---------------------------------------------------------------------------

async function main() {
  const accion = process.argv[2];
  const argumentos = process.argv.slice(3).filter((a) => !a.startsWith("--"));
  const pisarEscala = process.argv.includes("--escala-prueba");
  const zona = (argumentos[0] ?? "SALTA").toUpperCase() as ZonaNombre;

  if (accion === "cargar") {
    if (zona !== "SALTA" && zona !== "TUCUMAN") {
      throw new Error(`Zona invalida: "${zona}". Se espera SALTA o TUCUMAN.`);
    }
    await cargar(zona, pisarEscala);
  } else if (accion === "borrar") {
    await borrar();
  } else {
    console.error(
      "Uso:\n" +
        "  npx tsx scripts/datos-prueba.ts cargar [SALTA|TUCUMAN]\n" +
        "  npx tsx scripts/datos-prueba.ts borrar"
    );
    process.exit(1);
  }

  await db.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await db.$disconnect();
  process.exit(1);
});
