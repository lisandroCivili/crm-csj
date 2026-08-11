/**
 * Verificacion de la importacion de padrones. Solo para desarrollo.
 *
 *   npx tsx scripts/verificar-padron.ts "docs/Padron-xxx.xls" [--limpiar]
 *
 * Comprueba las tres propiedades de las que depende todo el modulo:
 *
 *   1. El archivo se parsea y los totales coinciden con el contenido real.
 *   2. Reimportar el mismo archivo no cambia absolutamente nada (idempotencia).
 *   3. Un padron del periodo siguiente, que se solapa con el anterior, continua
 *      la numeracion de cuotas sin duplicar ni saltear.
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
    where: { nomVenPadron: { in: parseo.nomVenEncontrados } },
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
      data: { nomVenPadron: nomVen, vendedorId: vendedor.id },
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

  titulo("4. REIMPORTACION DEL MISMO ARCHIVO (idempotencia)");
  const segunda = await importarPadron({
    filas: parseo.filas,
    zonaId: zona.id,
    soloSimular: false,
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

  titulo("RESULTADO");
  const todoOk = okTotales && idempotente && continua && consecutivas;
  console.log(todoOk ? "TODO OK" : "HAY FALLAS, revisar arriba");
  process.exitCode = todoOk ? 0 : 1;

  await db.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await db.$disconnect();
  process.exit(1);
});
