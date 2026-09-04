import { describe, expect, it } from "vitest";
import { hojaDePrueba, serialExcel } from "./hoja-de-prueba";
import { normalizarNomVen, parsePadron } from "./parsePadron";

/**
 * `parsePadron` es la puerta de entrada de todos los datos del sistema: de acá
 * salen los clientes, los títulos, las cuotas y —a través de `detectadaPagaAt`—
 * las comisiones. Hasta la Fase 14 no tenía un solo test: sólo se verificaba de
 * punta a punta con `scripts/verificar-padron.ts`, que necesita la base
 * levantada, un Excel real y la zona SALTA.
 */

const ENCABEZADOS = [
  "NomVen",
  "NumSor",
  "NumTit",
  "Nombre",
  "DNI",
  "Domicilio",
  "Telefono",
  "CodPos",
  "Localidad",
  "Emision",
  "Cuota",
  "Importe",
  "FchPago",
  "Boni",
  "Anti",
  "Detalle",
  "DebAutom",
  "Dis",
  "NomDis",
  "Rescate",
  "CuotasPagas",
  "Email",
];

/** Una fila completa y válida, sobre la que cada test cambia lo que le importa. */
function fila(cambios: Partial<Record<string, unknown>> = {}): unknown[] {
  const base: Record<string, unknown> = {
    NomVen: "PRUEBA VENDEDOR UNO",
    NumSor: "123",
    NumTit: "PT-0001",
    Nombre: "ANA PRUEBA",
    DNI: "99990001",
    Domicilio: "Calle Falsa 123",
    Telefono: "3870000001",
    CodPos: "4400",
    Localidad: "SALTA",
    Emision: serialExcel("2026-06-01"),
    Cuota: 1,
    Importe: 100000,
    FchPago: serialExcel("2026-06-10"),
    Boni: null,
    Anti: null,
    Detalle: null,
    DebAutom: "NO",
    Dis: null,
    NomDis: null,
    Rescate: null,
    CuotasPagas: 1,
    Email: "ana@ejemplo.com",
  };
  const completa = { ...base, ...cambios };
  return ENCABEZADOS.map((columna) => completa[columna] ?? null);
}

const conFilas = (filas: unknown[][]) => hojaDePrueba([ENCABEZADOS, ...filas]);

describe("parsePadron — fechas", () => {
  it("convierte el serial de Excel a una fecha UTC", () => {
    // 46174 es el 2026-06-01 en la cuenta de Excel. Va como literal a
    // propósito: usar `serialExcel` acá sería comprobar la fórmula del parser
    // contra la misma fórmula.
    const { filas } = parsePadron(conFilas([fila({ Emision: 46174 })]));
    expect(filas[0].emision.toISOString()).toBe("2026-06-01T00:00:00.000Z");
  });

  it("no depende de la zona horaria del servidor", () => {
    const { filas } = parsePadron(conFilas([fila({ Emision: serialExcel("2026-01-01") })]));
    expect(filas[0].emision.getUTCDate()).toBe(1);
    expect(filas[0].emision.getUTCMonth()).toBe(0);
    expect(filas[0].emision.getUTCFullYear()).toBe(2026);
  });

  it("FchPago vacío es una cuota impaga, no una fecha rara", () => {
    const { filas } = parsePadron(conFilas([fila({ FchPago: null })]));
    expect(filas[0].fechaPago).toBeNull();
  });

  it("acepta el serial escrito como texto", () => {
    const { filas } = parsePadron(conFilas([fila({ FchPago: String(serialExcel("2026-06-10")) })]));
    expect(filas[0].fechaPago?.toISOString()).toBe("2026-06-10T00:00:00.000Z");
  });

  it("el período va de la emisión más vieja a la más nueva", () => {
    const { periodoDesde, periodoHasta } = parsePadron(
      conFilas([
        fila({ NumTit: "PT-0001", Emision: serialExcel("2026-05-01") }),
        fila({ NumTit: "PT-0002", Emision: serialExcel("2026-03-01") }),
        fila({ NumTit: "PT-0003", Emision: serialExcel("2026-04-01") }),
      ])
    );
    expect(periodoDesde?.toISOString()).toBe("2026-03-01T00:00:00.000Z");
    expect(periodoHasta?.toISOString()).toBe("2026-05-01T00:00:00.000Z");
  });
});

describe("parsePadron — columnas personales", () => {
  /**
   * La distinción que costó borrar el email de una zona entera: con la columna
   * ausente y con la celda vacía, el valor llega `null` en los dos casos. Lo
   * único que los separa es `columnasPersonales`.
   */
  it("informa qué columnas personales traía el archivo", () => {
    const { columnasPersonales } = parsePadron(conFilas([fila()]));
    expect(columnasPersonales).toEqual([
      "nombre",
      "domicilio",
      "telefono",
      "codPos",
      "localidad",
      "email",
    ]);
  });

  it("una columna que no vino no aparece en la lista", () => {
    const sinEmail = ENCABEZADOS.filter((c) => c !== "Email");
    const buffer = hojaDePrueba([
      sinEmail,
      sinEmail.map((c) => (fila()[ENCABEZADOS.indexOf(c)] as unknown) ?? null),
    ]);
    const { columnasPersonales, filas } = parsePadron(buffer);

    expect(columnasPersonales).not.toContain("email");
    // Y el valor llega igual que si la celda estuviera vacía: por eso hace falta
    // la lista de arriba para poder distinguirlos.
    expect(filas[0].email).toBeNull();
  });

  it("la celda vacía sí aparece en la lista: la columna estaba", () => {
    const { columnasPersonales, filas } = parsePadron(conFilas([fila({ Email: null })]));
    expect(columnasPersonales).toContain("email");
    expect(filas[0].email).toBeNull();
  });
});

describe("parsePadron — filas con error", () => {
  it("señala cada falta con el número de fila del Excel", () => {
    const { filas, errores } = parsePadron(
      conFilas([
        fila({ NumTit: null }),
        fila({ DNI: null }),
        fila({ Nombre: null }),
        fila({ NomVen: null }),
        fila({ Emision: null }),
        fila({ Cuota: 0 }),
        fila({ Cuota: 1.5 }),
        fila(),
      ])
    );

    // La primera fila de datos es la 2 del Excel: la 1 son los encabezados.
    expect(errores.map((e) => e.fila)).toEqual([2, 3, 4, 5, 6, 7, 8]);
    expect(errores[0].motivo).toMatch(/título/i);
    expect(errores[1].motivo).toMatch(/DNI/i);
    expect(errores[5].motivo).toMatch(/cuota/i);
    // La única fila sana entra igual: un archivo con errores no se descarta
    // entero, se importa lo que sirve y se muestran los renglones que no.
    expect(filas).toHaveLength(1);
  });

  it("rechaza el archivo si le faltan columnas obligatorias", () => {
    expect(() => parsePadron(hojaDePrueba([["NomVen", "NumTit"], ["X", "PT-1"]]))).toThrow(
      /faltan columnas obligatorias/i
    );
  });

  it("rechaza un archivo sin filas de datos", () => {
    expect(() => parsePadron(hojaDePrueba([ENCABEZADOS]))).toThrow(/no tiene filas/i);
  });
});

describe("parsePadron — lectura de valores", () => {
  it("ubica las columnas por nombre, no por posición", () => {
    // El club puede reordenar el reporte; la importación tiene que seguir
    // funcionando.
    const alReves = [...ENCABEZADOS].reverse();
    const buffer = hojaDePrueba([
      alReves,
      alReves.map((c) => fila()[ENCABEZADOS.indexOf(c)]),
    ]);
    const { filas } = parsePadron(buffer);
    expect(filas[0].numTit).toBe("PT-0001");
    expect(filas[0].dni).toBe("99990001");
  });

  it("lee el importe con coma decimal", () => {
    const { filas } = parsePadron(conFilas([fila({ Importe: "1.234,56" })]));
    expect(filas[0].importe).toBe(1234.56);
  });

  it("un importe ilegible entra como 0, no rompe la fila", () => {
    const { filas, errores } = parsePadron(conFilas([fila({ Importe: null })]));
    expect(filas[0].importe).toBe(0);
    expect(errores).toHaveLength(0);
  });

  it("el débito automático es SI o no es", () => {
    const { filas } = parsePadron(
      conFilas([
        fila({ NumTit: "PT-0001", DebAutom: "SI" }),
        fila({ NumTit: "PT-0002", DebAutom: "si" }),
        fila({ NumTit: "PT-0003", DebAutom: "NO" }),
        fila({ NumTit: "PT-0004", DebAutom: null }),
      ])
    );
    expect(filas.map((f) => f.debitoAutomatico)).toEqual([true, true, false, false]);
  });
});

describe("normalizarNomVen", () => {
  it("unifica mayúsculas y espacios de más", () => {
    expect(normalizarNomVen("  toledo   pedro ")).toBe("TOLEDO PEDRO");
  });

  it("conserva los puntos de las abreviaturas", () => {
    // `TOLEDO PEDRO A.` y `TOLEDO PEDRO` son alias distintos a propósito: cada
    // variante se mapea a mano una sola vez, y borrar el punto los mezclaría.
    expect(normalizarNomVen("Toledo Pedro A.")).toBe("TOLEDO PEDRO A.");
  });

  it("los NomVen del archivo salen únicos y ordenados", () => {
    const { nomVenEncontrados } = parsePadron(
      conFilas([
        fila({ NumTit: "PT-0001", NomVen: "toledo pedro" }),
        fila({ NumTit: "PT-0002", NomVen: "  TOLEDO   PEDRO  " }),
        fila({ NumTit: "PT-0003", NomVen: "Acosta Ana" }),
      ])
    );
    expect(nomVenEncontrados).toEqual(["ACOSTA ANA", "TOLEDO PEDRO"]);
  });
});
