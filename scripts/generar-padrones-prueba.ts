/**
 * GENERADOR DE PADRONES DE PRUEBA. Solo para desarrollo.
 *
 *   npx tsx scripts/generar-padrones-prueba.ts            # las dos zonas
 *   npx tsx scripts/generar-padrones-prueba.ts SALTA
 *   npx tsx scripts/generar-padrones-prueba.ts TUCUMAN
 *
 * Escribe en `docs/padrones-prueba/` una serie de archivos con la misma forma
 * que los del club, para importar desde /admin/padron/importar y probar el
 * sistema sin usar datos reales.
 *
 * DOS ZONAS, DOS JUEGOS DE NUMEROS
 *
 * El numero de titulo no se repite nunca en todo el club (Balta, 04/09/2026),
 * asi que Tucuman lleva su propia numeracion (TT-*, DNI 9998*) y no una copia de
 * la de Salta. Reusar los PT-* simularia algo que en la realidad no pasa, y
 * ademas la importacion lo rechaza: un archivo con numeros que ya estan en la
 * otra zona no es una colision, es un archivo subido en la zona equivocada.
 *
 * El escenario de SALTA no se toca. Sus numeros son la referencia de todas las
 * guias de prueba ya validadas ($105.000, $38.000, $564.000, 8 clientes, 9
 * titulos, 69 cuotas): agregarle un titulo las invalidaria a todas.
 *
 * Lo que si comparten las dos zonas es el NomVen: `PRUEBA VENDEDOR UNO` aparece
 * en los padrones de las dos, y `TOLEDO PEDRO` tambien. Es deliberado — es el
 * caso que la Fase 13 vino a arreglar y el que hay que poder seguir probando.
 *
 * POR QUE ARCHIVOS Y NO UNA CARGA DIRECTA A LA BASE
 *
 * Porque la importacion es la pieza que hay que probar. Varias reglas del
 * sistema solo se pueden ver con padrones sucesivos que se solapan:
 *
 *   - el upsert idempotente por (tituloId, numeroCuota): reimportar el mismo
 *     archivo no tiene que cambiar nada;
 *   - una renovacion es un titulo que NO estaba en el padron anterior y aparece
 *     con cuota > 1, asi que hacen falta al menos dos padrones para detectarla;
 *   - una caida son 6 cuotas consecutivas impagas, y como cada padron trae 3
 *     meses, hay que encadenar varios para juntar ese historico.
 *
 * FORMA DEL PADRON REAL (verificada contra el del club)
 *
 * Cada archivo trae 3 emisiones mensuales por titulo (el mes del padron y los
 * dos anteriores), asi que padrones consecutivos se pisan en 2 de 3 meses. Las
 * fechas van como numero de serie de Excel, sin formato de fecha, que es como
 * las manda el club.
 *
 * Todo es ficticio y esta marcado: titulos PT-*, DNI 9999*, vendedores
 * "PRUEBA VENDEDOR *".
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import * as XLSX from "xlsx";
import { sufijoZonaPadronPrueba } from "../lib/padron/padrones-prueba";

const DESTINO = join("docs", "padrones-prueba");

/** Los 7 padrones que se generan, uno por mes. */
const MESES = [
  "2026-06",
  "2026-07",
  "2026-08",
  "2026-09",
  "2026-10",
  "2026-11",
  "2026-12",
];

const VENDEDOR_UNO = "PRUEBA VENDEDOR UNO";
const VENDEDOR_DOS = "PRUEBA VENDEDOR DOS";
/**
 * Balta y Pedro venden en las dos zonas y aparecen en los dos padrones. En el
 * padron real Pedro figura con tres variantes del mismo nombre; alcanza con una
 * para que el escenario tenga el caso.
 */
const PEDRO = "TOLEDO PEDRO";

type TituloPrueba = {
  numTit: string;
  nomVen: string;
  nombre: string;
  dni: string;
  localidad: string;
  importe: number;
  /** Mes calendario (YYYY-MM) en el que cae la cuota 1 de este titulo. */
  mesCuota1: string;
  /**
   * Primer padron en el que el club lo lista. Si es posterior a `mesCuota1`, el
   * titulo entra al sistema con una cuota mayor a 1: eso es una RENOVACION.
   */
  apareceDesde: string;
  /**
   * Los unicos padrones que lo listan. Sin esto aparece en todos, desde
   * `apareceDesde`. Sirve para dejar un HUECO en el historico: si el club salta
   * meses, hay cuotas que el sistema nunca vio y no puede dar por impagas.
   */
  apareceEnPadrones?: string[];
  /** A partir de esta cuota deja de pagar. Sin esto, paga todo. */
  dejaDePagarEnCuota?: number;
  /** Para explicar el escenario por pantalla. */
  proposito: string;
};

const TITULOS_SALTA: TituloPrueba[] = [
  {
    numTit: "PT-0001",
    nomVen: VENDEDOR_UNO,
    nombre: "ANA PRUEBA",
    dni: "99990001",
    localidad: "SALTA",
    importe: 100_000,
    mesCuota1: "2026-07",
    apareceDesde: "2026-07",
    proposito: "Venta nueva de julio: entra con cuota 1.",
  },
  {
    numTit: "PT-0002",
    nomVen: VENDEDOR_UNO,
    nombre: "BETO PRUEBA",
    dni: "99990002",
    localidad: "SALTA",
    importe: 100_000,
    mesCuota1: "2026-07",
    apareceDesde: "2026-07",
    proposito: "Segunda venta nueva de julio: con la anterior son 2 del mes.",
  },
  {
    numTit: "PT-0003",
    nomVen: VENDEDOR_DOS,
    nombre: "CARLA PRUEBA",
    dni: "99990003",
    localidad: "ORAN",
    importe: 200_000,
    mesCuota1: "2026-02",
    apareceDesde: "2026-06",
    proposito: "Titulo en curso: pasa por las cuotas 5 a 11 durante la serie.",
  },
  {
    numTit: "PT-0004",
    nomVen: VENDEDOR_DOS,
    nombre: "DIEGO PRUEBA",
    dni: "99990004",
    localidad: "ORAN",
    importe: 200_000,
    mesCuota1: "2022-01",
    apareceDesde: "2026-06",
    proposito: "Titulo viejo: cuotas 54 a 60, tramo 6-60 de la escala del agente.",
  },
  {
    numTit: "PT-0005",
    nomVen: VENDEDOR_UNO,
    nombre: "ELSA PRUEBA",
    dni: "99990005",
    localidad: "SALTA",
    importe: 100_000,
    mesCuota1: "2018-01",
    apareceDesde: "2026-06",
    proposito: "Titulo muy viejo: cuotas 102+, tramo 61+ de la escala del agente.",
  },
  {
    numTit: "PT-0006",
    nomVen: VENDEDOR_DOS,
    nombre: "FABIO PRUEBA",
    dni: "99990006",
    localidad: "TARTAGAL",
    importe: 200_000,
    mesCuota1: "2026-03",
    apareceDesde: "2026-09",
    proposito:
      "RENOVACION: no esta en los padrones de junio a agosto y aparece en el de septiembre, " +
      "que lo trae con las cuotas 5, 6 y 7. Entra por la 5, asi que no es venta nueva.",
  },
  {
    numTit: "PT-0007",
    nomVen: VENDEDOR_UNO,
    nombre: "GINA PRUEBA",
    dni: "99990007",
    localidad: "SALTA",
    importe: 100_000,
    mesCuota1: "2026-01",
    apareceDesde: "2026-06",
    dejaDePagarEnCuota: 4,
    proposito: "CAIDA: no paga ninguna cuota de la serie. Al septimo padron acumula mas de 6 impagas seguidas.",
  },
  {
    numTit: "PT-0008",
    nomVen: VENDEDOR_UNO,
    nombre: "GINA PRUEBA",
    dni: "99990007",
    localidad: "SALTA",
    importe: 100_000,
    mesCuota1: "2026-01",
    apareceDesde: "2026-06",
    proposito: "Segundo titulo de GINA, este si paga: la deja como caida PARCIAL, no total.",
  },
  {
    numTit: "PT-0009",
    nomVen: VENDEDOR_UNO,
    nombre: "HUGO PRUEBA",
    dni: "99990009",
    localidad: "SALTA",
    importe: 100_000,
    mesCuota1: "2025-01",
    apareceDesde: "2026-06",
    apareceEnPadrones: ["2026-06", "2026-12"],
    dejaDePagarEnCuota: 16,
    proposito:
      "SIN DATOS SUFICIENTES: el club lo lista en el primer padron (cuotas 16 a 18) y " +
      "recien vuelve a listarlo en el ultimo (22 a 24). Las cuotas 19, 20 y 21 nunca se " +
      "vieron, asi que la racha de impagas se corta ahi: son 3, no 6, y el sistema no " +
      "puede afirmar que este caido. Ninguna de sus cuotas esta paga, asi que no toca " +
      "las comisiones.",
  },
];

/**
 * TUCUMAN: un escenario chico, con numeracion propia.
 *
 * No es una copia del de Salta ni le hace falta serlo: lo que hay que poder
 * probar aca es el aislamiento entre zonas, no otra vez las caidas y las
 * renovaciones. Son pocos titulos y de importes distintos a proposito, para que
 * cualquier numero de Salta que se cuele en una pantalla de Tucuman —o al reves—
 * se vea de una.
 */
const TITULOS_TUCUMAN: TituloPrueba[] = [
  {
    numTit: "TT-0001",
    nomVen: VENDEDOR_UNO,
    nombre: "IVAN PRUEBA TUC",
    dni: "99980001",
    localidad: "SAN MIGUEL DE TUCUMAN",
    importe: 300_000,
    mesCuota1: "2026-07",
    apareceDesde: "2026-07",
    proposito:
      "Venta nueva de julio a nombre de PRUEBA VENDEDOR UNO, que tambien vende en Salta: " +
      "es el NomVen compartido entre zonas que la Fase 13 vino a arreglar.",
  },
  {
    numTit: "TT-0002",
    nomVen: PEDRO,
    nombre: "JUANA PRUEBA TUC",
    dni: "99980002",
    localidad: "CONCEPCION",
    importe: 300_000,
    mesCuota1: "2026-07",
    apareceDesde: "2026-07",
    proposito:
      "Venta nueva del agente: TOLEDO PEDRO vende en las dos zonas y cobra comision por " +
      "sus propios titulos, con la ficha de vendedor que le corresponda a cada zona.",
  },
  {
    numTit: "TT-0003",
    nomVen: PEDRO,
    nombre: "KARIM PRUEBA TUC",
    dni: "99980003",
    localidad: "TAFI VIEJO",
    importe: 300_000,
    mesCuota1: "2026-02",
    apareceDesde: "2026-06",
    proposito: "Titulo en curso: cuotas 5 a 11, para que la liquidacion no sea solo cuotas 1.",
  },
  {
    numTit: "TT-0004",
    nomVen: VENDEDOR_UNO,
    nombre: "LUCIA PRUEBA TUC",
    dni: "99980004",
    localidad: "SAN MIGUEL DE TUCUMAN",
    importe: 300_000,
    mesCuota1: "2022-01",
    apareceDesde: "2026-06",
    proposito:
      "Titulo viejo: cuotas 54 a 60. Cae en el tramo 6-60 del contrato de agencia, que es " +
      "el grueso del margen y el que el tope del vendedor deja afuera.",
  },
];

type Escenario = {
  titulos: TituloPrueba[];
};

const ESCENARIOS: Record<string, Escenario> = {
  SALTA: { titulos: TITULOS_SALTA },
  TUCUMAN: { titulos: TITULOS_TUCUMAN },
};

// ---------------------------------------------------------------------------
// Fechas
// ---------------------------------------------------------------------------

function mesADate(mes: string): Date {
  const [anio, m] = mes.split("-").map(Number);
  return new Date(Date.UTC(anio, m - 1, 1));
}

/** Meses enteros entre dos meses YYYY-MM. */
function distanciaEnMeses(desde: string, hasta: string): number {
  const a = mesADate(desde);
  const b = mesADate(hasta);
  return (
    (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth())
  );
}

function correrMeses(mes: string, cantidad: number): string {
  const d = mesADate(mes);
  const nueva = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + cantidad, 1));
  return `${nueva.getUTCFullYear()}-${String(nueva.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Excel cuenta los dias desde el 30/12/1899. El padron del club manda las
 * fechas asi, como numero crudo y sin formato, y el parser las lee de esa
 * forma: hay que escribirlas igual o no las reconoce.
 */
function aSerial(fecha: Date): number {
  return Math.round(fecha.getTime() / 86_400_000) + 25569;
}

// ---------------------------------------------------------------------------
// Generacion
// ---------------------------------------------------------------------------

const ENCABEZADOS = [
  "NomVen", "NumSor", "NumTit", "Nombre", "DNI", "Domicilio", "Telefono",
  "CodPos", "Localidad", "Emision", "Cuota", "Importe", "FchPago", "Boni",
  "Anti", "Detalle", "DebAutom", "Dis", "NomDis", "Rescate", "CuotasPagas",
  "Email",
];

type Resumen = { archivo: string; filas: number; titulos: number; detalle: string[] };

function generarPadron(
  mesPadron: string,
  titulos: TituloPrueba[]
): { filas: unknown[][]; resumen: Resumen } {
  // El padron del club trae el mes en curso y los dos anteriores.
  const emisiones = [correrMeses(mesPadron, -2), correrMeses(mesPadron, -1), mesPadron];

  const filas: unknown[][] = [];
  const titulosIncluidos = new Set<string>();
  const detalle: string[] = [];

  for (const t of titulos) {
    // Todavia no lo lista el club, o este mes no lo lista.
    const loLista = t.apareceEnPadrones
      ? t.apareceEnPadrones.includes(mesPadron)
      : distanciaEnMeses(t.apareceDesde, mesPadron) >= 0;
    if (!loLista) continue;

    const cuotasEnEstePadron: number[] = [];

    for (const emision of emisiones) {
      const numeroCuota = distanciaEnMeses(t.mesCuota1, emision) + 1;
      if (numeroCuota < 1) continue;

      // Ojo: no se filtran las emisiones anteriores a `apareceDesde`. Cuando el
      // club empieza a listar un titulo, lo manda con sus 3 meses igual que a
      // los demas; `apareceDesde` decide en que PADRON aparece, no desde que
      // emision. Justamente por eso una renovacion entra con cuota > 1.
      const paga =
        t.dejaDePagarEnCuota === undefined || numeroCuota < t.dejaDePagarEnCuota;

      const fechaEmision = mesADate(emision);
      // Se cobra alrededor del 10 de cada mes.
      const fechaPago = new Date(
        Date.UTC(fechaEmision.getUTCFullYear(), fechaEmision.getUTCMonth(), 10)
      );

      const cuotasPagas =
        t.dejaDePagarEnCuota === undefined
          ? numeroCuota
          : Math.max(0, t.dejaDePagarEnCuota - 1);

      filas.push([
        t.nomVen,
        String(100 + Number(t.numTit.slice(-2))),
        t.numTit,
        t.nombre,
        t.dni,
        `CALLE FALSA ${t.numTit.slice(-3)}`,
        "3870000000",
        "4400",
        t.localidad,
        aSerial(fechaEmision),
        numeroCuota,
        t.importe,
        paga ? aSerial(fechaPago) : null,
        null,
        null,
        `PRUEBA-${t.numTit}-${numeroCuota}`,
        null,
        "77000",
        "DISTRIBUCION PRUEBA",
        0,
        cuotasPagas,
        null,
      ]);

      cuotasEnEstePadron.push(numeroCuota);
      titulosIncluidos.add(t.numTit);
    }

    if (cuotasEnEstePadron.length > 0 && t.apareceDesde === mesPadron) {
      const minima = Math.min(...cuotasEnEstePadron);
      // En el primer padron de la serie no hay con que comparar: todos los
      // titulos son linea de base, no renovaciones. Recien desde el segundo un
      // titulo nuevo con cuota > 1 significa algo.
      const clasificacion =
        mesPadron === MESES[0]
          ? "(linea de base: es el primer padron)"
          : minima === 1
            ? "(venta nueva)"
            : "(renovacion)";
      detalle.push(`${t.numTit} entra por primera vez con cuota ${minima} ${clasificacion}`);
    }
  }

  return {
    filas,
    resumen: {
      archivo: "",
      filas: filas.length,
      titulos: titulosIncluidos.size,
      detalle,
    },
  };
}

function generarZona(zona: string, escenario: Escenario) {
  console.log(`\n=== ${zona} ===\n`);

  for (const [i, mes] of MESES.entries()) {
    const { filas, resumen } = generarPadron(mes, escenario.titulos);
    const nombre = `padron-prueba-${sufijoZonaPadronPrueba(zona)}${String(i + 1).padStart(2, "0")}-${mes}.xlsx`;

    const hoja = XLSX.utils.aoa_to_sheet([ENCABEZADOS, ...filas]);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, `padron-${mes}`);
    writeFileSync(join(DESTINO, nombre), XLSX.write(libro, { type: "buffer", bookType: "xlsx" }));

    resumen.archivo = nombre;
    console.log(`${nombre}  ${String(resumen.filas).padStart(3)} filas · ${resumen.titulos} titulos`);
    for (const linea of resumen.detalle) console.log(`     ${linea}`);
  }

  console.log("\nQue prueba cada titulo:\n");
  for (const t of escenario.titulos) {
    console.log(`  ${t.numTit}  ${t.nomVen.replace("PRUEBA VENDEDOR ", "V")}  ${t.proposito}`);
  }
}

function main() {
  mkdirSync(DESTINO, { recursive: true });

  const pedida = (process.argv[2] ?? "").toUpperCase();
  if (pedida && !ESCENARIOS[pedida]) {
    console.error(`Zona desconocida: "${pedida}". Las que hay: ${Object.keys(ESCENARIOS).join(", ")}.`);
    process.exitCode = 1;
    return;
  }

  const zonas = pedida ? [pedida] : Object.keys(ESCENARIOS);

  console.log("Generando padrones de prueba en", DESTINO);
  for (const zona of zonas) generarZona(zona, ESCENARIOS[zona]);

  console.log(
    "\nSe importan en orden desde /admin/padron/importar, cada juego en SU zona.\n" +
      "Antes conviene vaciar el padron desde /admin/laboratorio.\n" +
      "Para dejar todo armado de una: npx tsx scripts/sembrar-demo.ts\n"
  );
}

main();
