/**
 * Verificacion de la importacion de padrones. Solo para desarrollo.
 *
 *   npx tsx scripts/verificar-padron.ts "docs/Padron-xxx.xls" [--limpiar]
 *
 * Comprueba las propiedades de las que depende todo el modulo:
 *
 *   1. El archivo se parsea y los totales coinciden con el contenido real.
 *   2. Reimportar el mismo archivo no cambia absolutamente nada (idempotencia).
 *   3. Un padron del periodo siguiente, que se solapa con el anterior, continua
 *      la numeracion de cuotas sin duplicar ni saltear.
 *   4. El origen de cada titulo: todo BASE en la primera importacion de la zona,
 *      y despues venta nueva o renovacion segun la cuota con la que aparezca.
 *   5. El estado de caida que deja la importacion coincide con recorrer el
 *      historico de cuotas a mano, y ningun titulo con huecos se da por caido.
 *
 * Crea vendedores de relleno para los NomVen que no esten vinculados, porque en
 * la aplicacion real ese mapeo lo hace el admin antes de importar.
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { db } from "../lib/db";
import { parsePadron, type FilaPadron } from "../lib/excel/parsePadron";
import { importarPadron } from "../lib/padron/importarPadron";

const ruta = process.argv[2];
const limpiar = process.argv.includes("--limpiar");

if (!ruta) {
  console.error("Falta la ruta del archivo.");
  process.exit(1);
}

function titulo(texto: string) {
  console.log(`\n${"─".repeat(64)}\n${texto}\n${"─".repeat(64)}`);
}

function sumarMes(fecha: Date): Date {
  const nueva = new Date(fecha);
  nueva.setUTCMonth(nueva.getUTCMonth() + 1);
  return nueva;
}

async function main() {
  const buffer = readFileSync(ruta);

  titulo("1. PARSEO");
  const parseo = parsePadron(buffer);
  const titulos = new Set(parseo.filas.map((f) => f.numTit));
  const dnis = new Set(parseo.filas.map((f) => f.dni));
  const emisiones = [...new Set(parseo.filas.map((f) => f.emision.toISOString().slice(0, 10)))].sort();

  console.log(`filas validas ......... ${parseo.filas.length}`);
  console.log(`filas con error ....... ${parseo.errores.length}`);
  console.log(`titulos ............... ${titulos.size}`);
  console.log(`clientes (DNI) ........ ${dnis.size}`);
  console.log(`vendedores (NomVen) ... ${parseo.nomVenEncontrados.length}`);
  console.log(`periodos .............. ${emisiones.join(", ")}`);
  if (parseo.errores.length > 0) {
    console.log("primeros errores:");
    parseo.errores.slice(0, 5).forEach((e) => console.log(`   fila ${e.fila}: ${e.motivo}`));
  }

  const zona = await db.zona.findUniqueOrThrow({ where: { nombre: "SALTA" } });

  if (limpiar) {
    titulo("LIMPIEZA");
    await db.tituloCuota.deleteMany({});
    await db.titulo.deleteMany({});
    await db.cliente.deleteMany({});
    await db.padronImport.deleteMany({});
    console.log("datos de padron borrados");
  }

  titulo("2. VINCULACION DE VENDEDORES");
  const yaVinculados = await db.vendedorAlias.findMany({
    where: { zonaId: zona.id, nomVenPadron: { in: parseo.nomVenEncontrados } },
    select: { nomVenPadron: true },
  });
  const faltantes = parseo.nomVenEncontrados.filter(
    (n) => !yaVinculados.some((a) => a.nomVenPadron === n)
  );

  for (const [i, nomVen] of faltantes.entries()) {
    const vendedor = await db.vendedor.create({
      data: {
        nombreCompleto: nomVen,
        dni: `90${String(i).padStart(6, "0")}`,
        codigo: `P${String(i).padStart(3, "0")}`,
        zonaId: zona.id,
      },
    });
    await db.vendedorAlias.create({
      data: { nomVenPadron: nomVen, vendedorId: vendedor.id, zonaId: zona.id },
    });
  }
  console.log(`ya vinculados ......... ${yaVinculados.length}`);
  console.log(`creados de relleno .... ${faltantes.length}`);

  const admin = await db.user.findFirstOrThrow({ where: { role: "ADMIN" } });
  const lote = {
    archivoNombre: ruta.split(/[\\/]/).pop()!,
    importadoPorUserId: admin.id,
    periodoDesde: parseo.periodoDesde,
    periodoHasta: parseo.periodoHasta,
  };

  titulo("3. PRIMERA IMPORTACION");
  const inicio = Date.now();
  const primera = await importarPadron({
    filas: parseo.filas,
    zonaId: zona.id,
    soloSimular: false,
    columnasPersonales: parseo.columnasPersonales,
    lote,
  });
  console.table(primera);
  console.log(`tardo ${((Date.now() - inicio) / 1000).toFixed(1)}s`);

  const enBase = {
    clientes: await db.cliente.count({ where: { zonaId: zona.id } }),
    titulos: await db.titulo.count({ where: { zonaId: zona.id } }),
    cuotas: await db.tituloCuota.count(),
  };
  console.log("\nen la base:");
  console.table(enBase);

  const okTotales =
    enBase.titulos === titulos.size &&
    enBase.clientes === dnis.size &&
    enBase.cuotas === parseo.filas.length;
  console.log(okTotales ? "OK: los totales coinciden con el archivo" : "FALLA: los totales no coinciden");

  // Origen de los titulos: en la primera importacion de la zona no hay padron
  // anterior contra el cual comparar, asi que todo tiene que quedar como BASE.
  const porOrigen = await db.titulo.groupBy({
    by: ["origen"],
    where: { zonaId: zona.id },
    _count: true,
  });
  console.log("\norigen de los titulos:");
  console.table(Object.fromEntries(porOrigen.map((o) => [o.origen, o._count])));

  const okOrigenBase =
    !primera.esLineaBase || porOrigen.every((o) => o.origen === "BASE");
  console.log(
    primera.esLineaBase
      ? okOrigenBase
        ? "OK: era la primera importacion de la zona, todos los titulos quedaron como BASE"
        : "FALLA: la primera importacion marco titulos como venta nueva o renovacion"
      : "(ya habia padrones cargados: el origen se decidio contra lo que existia)"
  );

  titulo("4. REIMPORTACION DEL MISMO ARCHIVO (idempotencia)");
  const segunda = await importarPadron({
    filas: parseo.filas,
    zonaId: zona.id,
    soloSimular: false,
    columnasPersonales: parseo.columnasPersonales,
    lote,
  });
  console.table(segunda);

  const idempotente =
    segunda.clientesNuevos === 0 &&
    segunda.titulosNuevos === 0 &&
    segunda.cuotasNuevas === 0 &&
    segunda.cuotasActualizadas === 0 &&
    segunda.cuotasRecienPagadas === 0 &&
    segunda.cuotasSinCambios === parseo.filas.length;

  const despues = await db.tituloCuota.count();
  console.log(
    idempotente && despues === enBase.cuotas
      ? "OK: reimportar no cambio nada"
      : `FALLA: la reimportacion altero datos (cuotas antes ${enBase.cuotas}, despues ${despues})`
  );

  titulo("5. PADRON DEL PERIODO SIGUIENTE (con solapamiento)");
  // Se arma un padron que repite los 2 ultimos meses del anterior y agrega uno
  // nuevo: es el caso critico, porque 2 de cada 3 cuotas ya estan cargadas.
  const [, ...mesesQueSeRepiten] = emisiones;
  const filasRepetidas = parseo.filas.filter((f) =>
    mesesQueSeRepiten.includes(f.emision.toISOString().slice(0, 10))
  );
  const ultimoMes = emisiones[emisiones.length - 1];
  const filasDelMesNuevo: FilaPadron[] = parseo.filas
    .filter((f) => f.emision.toISOString().slice(0, 10) === ultimoMes)
    .map((f) => ({
      ...f,
      emision: sumarMes(f.emision),
      numeroCuota: f.numeroCuota + 1,
      fechaPago: null,
      detalle: null,
    }));

  const siguiente = await importarPadron({
    filas: [...filasRepetidas, ...filasDelMesNuevo],
    zonaId: zona.id,
    soloSimular: false,
    columnasPersonales: parseo.columnasPersonales,
    lote: { ...lote, archivoNombre: "simulado-mes-siguiente.xls" },
  });
  console.table(siguiente);

  const continua =
    siguiente.cuotasNuevas === filasDelMesNuevo.length &&
    siguiente.cuotasActualizadas === 0 &&
    siguiente.cuotasSinCambios === filasRepetidas.length;
  console.log(
    continua
      ? `OK: agrego solo las ${filasDelMesNuevo.length} cuotas del mes nuevo y no toco las ${filasRepetidas.length} que se solapaban`
      : "FALLA: el solapamiento no se resolvio bien"
  );

  // Un titulo de muestra tiene que tener sus cuotas consecutivas, sin huecos.
  const muestra = await db.titulo.findFirstOrThrow({
    where: { zonaId: zona.id },
    include: { cuotas: { orderBy: { numeroCuota: "asc" } }, cliente: true },
  });
  const numeros = muestra.cuotas.map((c) => c.numeroCuota);
  const consecutivas = numeros.every((n, i) => i === 0 || n === numeros[i - 1] + 1);
  console.log(
    `\ntitulo de muestra ${muestra.numTit}: cuotas ${numeros.join(", ")} ` +
      (consecutivas ? "(consecutivas, sin huecos)" : "(FALLA: hay huecos)")
  );

  titulo("6. VENTA NUEVA vs. RENOVACION");
  // Dos titulos que el padron todavia no traia: uno arranca en la cuota 1 (se
  // vendio este mes) y el otro en la 20 (el cliente ya venia pagando). Es la
  // regla que Balta definio el 24/08/2026, probada contra la base y no solo en
  // el test de la funcion pura.
  const molde = parseo.filas[0];
  const mesNuevo = sumarMes(new Date(ultimoMes));
  const filasDeAlta: FilaPadron[] = [
    ...[1, 2, 3].map((numeroCuota) => ({
      ...molde,
      numTit: "VERIF-VENTA",
      dni: "99999901",
      nombre: "PRUEBA VERIFICACION VENTA",
      emision: mesNuevo,
      numeroCuota,
      fechaPago: null,
    })),
    ...[20, 21, 22].map((numeroCuota) => ({
      ...molde,
      numTit: "VERIF-RENOV",
      dni: "99999902",
      nombre: "PRUEBA VERIFICACION RENOVACION",
      emision: mesNuevo,
      numeroCuota,
      fechaPago: null,
    })),
  ];

  const conAltas = await importarPadron({
    filas: filasDeAlta,
    zonaId: zona.id,
    soloSimular: false,
    columnasPersonales: parseo.columnasPersonales,
    lote: { ...lote, archivoNombre: "simulado-altas.xls" },
  });
  console.table(conAltas);

  const altas = await db.titulo.findMany({
    where: { numTit: { in: ["VERIF-VENTA", "VERIF-RENOV"] } },
    select: { numTit: true, origen: true, cuotaInicial: true },
    orderBy: { numTit: "asc" },
  });
  console.table(altas);

  const venta = altas.find((t) => t.numTit === "VERIF-VENTA");
  const renovacion = altas.find((t) => t.numTit === "VERIF-RENOV");
  const okOrigenes =
    !conAltas.esLineaBase &&
    conAltas.titulosNuevos === 2 &&
    conAltas.titulosNuevosVenta === 1 &&
    conAltas.titulosNuevosRenovacion === 1 &&
    venta?.origen === "VENTA_NUEVA" &&
    venta.cuotaInicial === 1 &&
    renovacion?.origen === "RENOVACION" &&
    renovacion.cuotaInicial === 20;
  console.log(
    okOrigenes
      ? "OK: el titulo que arranca en cuota 1 quedo como venta nueva y el que arranca en la 20, como renovacion"
      : "FALLA: el origen de los titulos nuevos no se resolvio bien"
  );

  // Los de prueba no quedan en la base: no son parte del padron.
  await db.titulo.deleteMany({ where: { numTit: { in: ["VERIF-VENTA", "VERIF-RENOV"] } } });
  await db.cliente.deleteMany({ where: { dni: { in: ["99999901", "99999902"] } } });

  titulo("7. CAIDAS");
  // El estado de caida lo deja la importacion. Aca no se comprueba un numero
  // esperado —depende del padron— sino la propiedad que importa: que lo que
  // quedo guardado coincida con recorrer el historico a mano, y que ningun
  // titulo con huecos en la numeracion se haya dado por caido.
  const conCuotas = await db.titulo.findMany({
    where: { zonaId: zona.id },
    select: {
      numTit: true,
      impagasConsecutivas: true,
      caidoAt: true,
      caidaConfiable: true,
      cuotaMinConocida: true,
      cuotaMaxConocida: true,
      cuotas: { select: { numeroCuota: true, fechaPago: true } },
    },
  });

  let rachasMal = 0;
  let caidosSinRespaldo = 0;
  let caidos = 0;
  let sinDatos = 0;

  for (const t of conCuotas) {
    const pagada = new Map(t.cuotas.map((c) => [c.numeroCuota, c.fechaPago !== null]));
    const max = Math.max(...pagada.keys());
    const min = Math.min(...pagada.keys());

    let racha = 0;
    let cerrada = false;
    for (let n = max; n >= 1; n--) {
      if (!pagada.has(n)) break;
      if (pagada.get(n)) {
        cerrada = true;
        break;
      }
      racha++;
      if (n === 1) cerrada = true;
    }

    if (
      t.impagasConsecutivas !== racha ||
      t.cuotaMinConocida !== min ||
      t.cuotaMaxConocida !== max ||
      t.caidaConfiable !== (racha >= 6 || cerrada)
    ) {
      rachasMal++;
    }
    if ((t.caidoAt !== null) !== racha >= 6) caidosSinRespaldo++;
    if (t.caidoAt) caidos++;
    if (!t.caidaConfiable) sinDatos++;
  }

  console.log(`titulos ............... ${conCuotas.length}`);
  console.log(`caidos ................ ${caidos}`);
  console.log(`sin datos suficientes . ${sinDatos}`);
  console.log(`rachas que no coinciden ${rachasMal}`);

  const okCaidas = rachasMal === 0 && caidosSinRespaldo === 0;
  console.log(
    okCaidas
      ? "OK: el estado guardado coincide con recorrer el historico a mano, titulo por titulo"
      : `FALLA: ${rachasMal} rachas mal calculadas, ${caidosSinRespaldo} caidas sin respaldo`
  );

  titulo("RESULTADO");
  const todoOk =
    okTotales &&
    okOrigenBase &&
    idempotente &&
    continua &&
    consecutivas &&
    okOrigenes &&
    okCaidas;
  console.log(todoOk ? "TODO OK" : "HAY FALLAS, revisar arriba");
  process.exitCode = todoOk ? 0 : 1;

  await db.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await db.$disconnect();
  process.exit(1);
});
