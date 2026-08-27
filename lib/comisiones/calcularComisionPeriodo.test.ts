import { describe, expect, it } from "vitest";
import {
  calcularComisionPeriodo,
  tramoParaVolumen,
  type CuotaCobrada,
  type FilaEscala,
} from "./calcularComisionPeriodo";

/**
 * Escala inventada para los tests. Los porcentajes reales los carga Balta en
 * `EscalaComision`: no salen de aca ni de ningun otro lugar del codigo.
 *
 *          c1     c2     c3     c4     c5
 *   0-4     5 %    3 %    2 %    1 %   0,5 %
 *   5-9     8 %    4 %    3 %    2 %     1 %
 *   10+    12 %    6 %    4 %    3 %     2 %
 */
const ESCALA: FilaEscala[] = [
  ...porcentajes(0, 4, [5, 3, 2, 1, 0.5]),
  ...porcentajes(5, 9, [8, 4, 3, 2, 1]),
  ...porcentajes(10, null, [12, 6, 4, 3, 2]),
];

function porcentajes(
  ventasMin: number,
  ventasMax: number | null,
  valores: number[]
): FilaEscala[] {
  return valores.map((porcentaje, indice) => ({
    ventasMin,
    ventasMax,
    numeroCuota: indice + 1,
    porcentaje,
  }));
}

/** `cuotas(1, 3)` = tres cuotas numero 1 de $1.000 cada una. */
function cuotas(numeroCuota: number, cantidad: number, importe = 1000): CuotaCobrada[] {
  return Array.from({ length: cantidad }, (_, i) => ({
    id: `c${numeroCuota}-${i}`,
    numeroCuota,
    importe,
  }));
}

const SIN_TOPE = 5;

describe("volumen del mes y tramo de escala", () => {
  it("cuenta como ventas nuevas solo las cuotas 1", () => {
    const resultado = calcularComisionPeriodo({
      cuotas: [...cuotas(1, 3), ...cuotas(2, 7), ...cuotas(3, 12)],
      escalas: ESCALA,
      topeCuotasComision: SIN_TOPE,
    });

    expect(resultado.ventasNuevas).toBe(3);
    expect(resultado.tramo).toEqual({ ventasMin: 0, ventasMax: 4 });
  });

  it("el tramo es mensual: 7 ventas nuevas caen en el tramo del medio", () => {
    const resultado = calcularComisionPeriodo({
      cuotas: cuotas(1, 7),
      escalas: ESCALA,
      topeCuotasComision: SIN_TOPE,
    });

    expect(resultado.tramo).toEqual({ ventasMin: 5, ventasMax: 9 });
    // 7 cuotas de $1.000 al 8 %
    expect(resultado.totalComisionCuotas).toBe(560);
  });

  it("el ultimo tramo no tiene tope superior", () => {
    const resultado = calcularComisionPeriodo({
      cuotas: cuotas(1, 40),
      escalas: ESCALA,
      topeCuotasComision: SIN_TOPE,
    });

    expect(resultado.tramo).toEqual({ ventasMin: 10, ventasMax: null });
    expect(resultado.totalComisionCuotas).toBe(4800);
  });

  it("con 0 ventas nuevas igual cobra las cuotas viejas, al porcentaje mas bajo", () => {
    const resultado = calcularComisionPeriodo({
      cuotas: [...cuotas(2, 10), ...cuotas(3, 5)],
      escalas: ESCALA,
      topeCuotasComision: SIN_TOPE,
    });

    expect(resultado.ventasNuevas).toBe(0);
    expect(resultado.tramo).toEqual({ ventasMin: 0, ventasMax: 4 });
    // 10 × $1.000 al 3 % + 5 × $1.000 al 2 %
    expect(resultado.totalComisionCuotas).toBe(300 + 100);
    expect(resultado.advertencias).toEqual([]);
  });

  it("avisa cuando ningun tramo cubre el volumen del mes", () => {
    const escalaIncompleta = porcentajes(5, null, [8, 4, 3, 2, 1]);

    const resultado = calcularComisionPeriodo({
      cuotas: cuotas(2, 4),
      escalas: escalaIncompleta,
      topeCuotasComision: SIN_TOPE,
    });

    expect(resultado.tramo).toBeNull();
    expect(resultado.totalComisionCuotas).toBe(0);
    expect(resultado.advertencias).toHaveLength(1);
    expect(resultado.advertencias[0]).toContain("0 ventas nuevas");
  });

  it("no se queja de la escala cuando el vendedor no cobro nada", () => {
    const resultado = calcularComisionPeriodo({
      cuotas: [],
      escalas: [],
      topeCuotasComision: SIN_TOPE,
    });

    expect(resultado.advertencias).toEqual([]);
    expect(resultado.totalComision).toBe(0);
  });

  it("avisa cuando al tramo le falta el porcentaje de una cuota", () => {
    const escalaSinCuota3: FilaEscala[] = ESCALA.filter(
      (fila) => !(fila.ventasMin === 0 && fila.numeroCuota === 3)
    );

    const resultado = calcularComisionPeriodo({
      cuotas: [...cuotas(2, 2), ...cuotas(3, 2)],
      escalas: escalaSinCuota3,
      topeCuotasComision: SIN_TOPE,
    });

    const cuota3 = resultado.grupos.find((grupo) => grupo.numeroCuota === 3);
    expect(cuota3?.porcentajeAplicado).toBe(0);
    expect(cuota3?.monto).toBe(0);
    // La cuota 2 se paga igual: un hueco en la escala no frena el resto.
    expect(resultado.totalComisionCuotas).toBe(60);
    expect(resultado.advertencias[0]).toContain("cuota 3");
  });
});

describe("tramoParaVolumen", () => {
  it("los limites del tramo son inclusivos", () => {
    expect(tramoParaVolumen(ESCALA, 4)).toEqual({ ventasMin: 0, ventasMax: 4 });
    expect(tramoParaVolumen(ESCALA, 5)).toEqual({ ventasMin: 5, ventasMax: 9 });
    expect(tramoParaVolumen(ESCALA, 9)).toEqual({ ventasMin: 5, ventasMax: 9 });
    expect(tramoParaVolumen(ESCALA, 10)).toEqual({ ventasMin: 10, ventasMax: null });
  });

  it("ante tramos solapados gana el de piso mas alto", () => {
    const solapada: FilaEscala[] = [
      ...porcentajes(0, 20, [5, 3, 2, 1, 0.5]),
      ...porcentajes(10, null, [12, 6, 4, 3, 2]),
    ];

    expect(tramoParaVolumen(solapada, 15)).toEqual({ ventasMin: 10, ventasMax: null });
  });

  it("devuelve null cuando el volumen queda por debajo de todos los tramos", () => {
    expect(tramoParaVolumen(porcentajes(3, null, [5]), 2)).toBeNull();
  });
});

describe("agrupacion por numero de cuota", () => {
  it("suma los importes de cada numero y aplica su propio porcentaje", () => {
    const resultado = calcularComisionPeriodo({
      cuotas: [...cuotas(1, 6), ...cuotas(2, 4), ...cuotas(4, 2)],
      escalas: ESCALA,
      topeCuotasComision: SIN_TOPE,
    });

    expect(resultado.grupos).toEqual([
      {
        numeroCuota: 1,
        cantidadCuotas: 6,
        baseCalculo: 6000,
        porcentajeAplicado: 8,
        monto: 480,
        cuotaIds: expect.any(Array),
      },
      {
        numeroCuota: 2,
        cantidadCuotas: 4,
        baseCalculo: 4000,
        porcentajeAplicado: 4,
        monto: 160,
        cuotaIds: expect.any(Array),
      },
      {
        numeroCuota: 4,
        cantidadCuotas: 2,
        baseCalculo: 2000,
        porcentajeAplicado: 2,
        monto: 40,
        cuotaIds: expect.any(Array),
      },
    ]);
    expect(resultado.totalComisionCuotas).toBe(680);
  });

  it("los renglones salen ordenados por numero de cuota", () => {
    const resultado = calcularComisionPeriodo({
      cuotas: [...cuotas(5, 1), ...cuotas(2, 1), ...cuotas(3, 1)],
      escalas: ESCALA,
      topeCuotasComision: SIN_TOPE,
    });

    expect(resultado.grupos.map((grupo) => grupo.numeroCuota)).toEqual([2, 3, 5]);
  });

  it("cada renglon lista las cuotas que lo componen", () => {
    const resultado = calcularComisionPeriodo({
      cuotas: cuotas(2, 3),
      escalas: ESCALA,
      topeCuotasComision: SIN_TOPE,
    });

    expect(resultado.grupos[0].cuotaIds).toEqual(["c2-0", "c2-1", "c2-2"]);
  });
});

describe("tope de cuotas del vendedor", () => {
  const todasLasCuotas = [
    ...cuotas(1, 1),
    ...cuotas(2, 1),
    ...cuotas(3, 1),
    ...cuotas(4, 1),
    ...cuotas(5, 1),
  ];

  // Con 1 venta nueva rige el tramo 0-4: c1 5 %, c2 3 %, c3 2 %, c4 1 %, c5 0,5 %
  const casos = [
    { tope: 1, cuotasQueCobra: [1], comision: 50, fuera: 4 },
    { tope: 2, cuotasQueCobra: [1, 2], comision: 80, fuera: 3 },
    { tope: 3, cuotasQueCobra: [1, 2, 3], comision: 100, fuera: 2 },
    { tope: 4, cuotasQueCobra: [1, 2, 3, 4], comision: 110, fuera: 1 },
    { tope: 5, cuotasQueCobra: [1, 2, 3, 4, 5], comision: 115, fuera: 0 },
  ];

  it.each(casos)(
    "con tope c$tope cobra hasta la cuota $tope y descarta $fuera",
    ({ tope, cuotasQueCobra, comision, fuera }) => {
      const resultado = calcularComisionPeriodo({
        cuotas: todasLasCuotas,
        escalas: ESCALA,
        topeCuotasComision: tope,
      });

      expect(resultado.grupos.map((grupo) => grupo.numeroCuota)).toEqual(cuotasQueCobra);
      expect(resultado.totalComisionCuotas).toBe(comision);
      expect(resultado.cuotasFueraDeTope).toBe(fuera);
      expect(resultado.baseFueraDeTope).toBe(fuera * 1000);
    }
  );

  it("las cuotas fuera de tope no cuentan como ventas nuevas ni ensucian la base", () => {
    const resultado = calcularComisionPeriodo({
      cuotas: [...cuotas(1, 2), ...cuotas(5, 3)],
      escalas: ESCALA,
      topeCuotasComision: 2,
    });

    expect(resultado.ventasNuevas).toBe(2);
    expect(resultado.grupos).toHaveLength(1);
    expect(resultado.grupos[0].baseCalculo).toBe(2000);
    expect(resultado.baseFueraDeTope).toBe(3000);
  });
});

/**
 * Una renovacion es un titulo que aparece en el padron sin haber estado en el
 * anterior y con cuota mayor a 1 (ver `lib/padron/origenTitulo.ts`). Balta
 * confirmo el 24/08/2026 como cobra: NO suma al volumen del tramo, y sus cuotas
 * cobran el porcentaje de la cuota real, dentro del tope del vendedor.
 *
 * El motor ya hace exactamente eso sin saber que existen las renovaciones: solo
 * mira numeros de cuota. Estos tests estan para que siga siendo asi.
 */
describe("renovaciones", () => {
  it("no suman al volumen del tramo: sin cuotas 1 el vendedor queda en el tramo mas bajo", () => {
    // Seis renovaciones que entran por la cuota 3. Si contaran como ventas
    // nuevas caeria en el tramo 5-9 y cobraria 3 % en vez de 2 %.
    const resultado = calcularComisionPeriodo({
      cuotas: cuotas(3, 6),
      escalas: ESCALA,
      topeCuotasComision: SIN_TOPE,
    });

    expect(resultado.ventasNuevas).toBe(0);
    expect(resultado.tramo).toEqual({ ventasMin: 0, ventasMax: 4 });
    expect(resultado.grupos[0].porcentajeAplicado).toBe(2);
    expect(resultado.totalComisionCuotas).toBe(120);
  });

  it("cobran el porcentaje de la cuota real, no el de la cuota 1", () => {
    const resultado = calcularComisionPeriodo({
      cuotas: [...cuotas(1, 1), ...cuotas(4, 1)],
      escalas: ESCALA,
      topeCuotasComision: SIN_TOPE,
    });

    // c1 al 5 % = $50; la renovacion entra por c4, al 1 % = $10.
    expect(resultado.grupos).toEqual([
      expect.objectContaining({ numeroCuota: 1, porcentajeAplicado: 5, monto: 50 }),
      expect.objectContaining({ numeroCuota: 4, porcentajeAplicado: 1, monto: 10 }),
    ]);
  });

  it("arriba del tope del vendedor no cobran nada", () => {
    const resultado = calcularComisionPeriodo({
      cuotas: cuotas(7, 3),
      escalas: ESCALA,
      topeCuotasComision: SIN_TOPE,
    });

    expect(resultado.grupos).toHaveLength(0);
    expect(resultado.cuotasFueraDeTope).toBe(3);
    expect(resultado.totalComision).toBe(0);
  });
});

describe("totales y redondeo", () => {
  it("suma los gastos de representacion al total", () => {
    const resultado = calcularComisionPeriodo({
      cuotas: cuotas(1, 2),
      escalas: ESCALA,
      topeCuotasComision: SIN_TOPE,
      gastosRepresentacion: 15_000,
    });

    expect(resultado.totalComisionCuotas).toBe(100);
    expect(resultado.gastosRepresentacion).toBe(15_000);
    expect(resultado.totalComision).toBe(15_100);
  });

  it("redondea a dos decimales sin arrastrar error de punto flotante", () => {
    const resultado = calcularComisionPeriodo({
      cuotas: [
        { id: "a", numeroCuota: 2, importe: 1000.1 },
        { id: "b", numeroCuota: 2, importe: 2000.2 },
        { id: "c", numeroCuota: 2, importe: 3000.3 },
      ],
      escalas: ESCALA,
      topeCuotasComision: SIN_TOPE,
    });

    expect(resultado.grupos[0].baseCalculo).toBe(6000.6);
    // 6000,60 × 3 % = 180,018 → 180,02
    expect(resultado.grupos[0].monto).toBe(180.02);
  });

  it("el total es la suma exacta de los renglones", () => {
    const resultado = calcularComisionPeriodo({
      cuotas: [
        { id: "a", numeroCuota: 1, importe: 33_333.33 },
        { id: "b", numeroCuota: 2, importe: 33_333.33 },
        { id: "c", numeroCuota: 3, importe: 33_333.33 },
      ],
      escalas: ESCALA,
      topeCuotasComision: SIN_TOPE,
    });

    const suma = resultado.grupos.reduce((total, grupo) => total + grupo.monto, 0);
    expect(resultado.totalComisionCuotas).toBeCloseTo(suma, 2);
  });
});

describe("pureza", () => {
  it("no toca la entrada y devuelve siempre lo mismo", () => {
    const entrada = {
      cuotas: [...cuotas(1, 3), ...cuotas(2, 2)],
      escalas: ESCALA,
      topeCuotasComision: 3,
      gastosRepresentacion: 500,
    };
    const copia = structuredClone(entrada);

    const primera = calcularComisionPeriodo(entrada);
    const segunda = calcularComisionPeriodo(entrada);

    expect(entrada).toEqual(copia);
    expect(primera).toEqual(segunda);
  });
});
