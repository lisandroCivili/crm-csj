import { describe, expect, it } from "vitest";
import {
  calcularComisionAgente,
  revisarEscalaAgente,
  tramoParaCuota,
  type TramoAgente,
} from "./calcularComisionAgente";
import type { CuotaCobrada } from "./calcularComisionPeriodo";

/**
 * La escala del contrato de agencia vigente (adenda del 13/01/2023). Se usa acá
 * como caso de prueba, no como fuente: en el sistema los porcentajes salen de
 * `EscalaAgente` y Balta los puede cambiar.
 *
 *   c1-c2    25 %
 *   c3-c4    20 %
 *   c5       10 %
 *   c6-c60    4 %
 *   c61+      2 %
 */
const CONTRATO: TramoAgente[] = [
  { cuotaDesde: 1, cuotaHasta: 2, porcentaje: 25 },
  { cuotaDesde: 3, cuotaHasta: 4, porcentaje: 20 },
  { cuotaDesde: 5, cuotaHasta: 5, porcentaje: 10 },
  { cuotaDesde: 6, cuotaHasta: 60, porcentaje: 4 },
  { cuotaDesde: 61, cuotaHasta: null, porcentaje: 2 },
];

/** `cuotas(12, 3)` = tres cuotas número 12 de $1.000 cada una. */
function cuotas(numeroCuota: number, cantidad: number, importe = 1000): CuotaCobrada[] {
  return Array.from({ length: cantidad }, (_, i) => ({
    id: `c${numeroCuota}-${i}`,
    numeroCuota,
    importe,
  }));
}

describe("a qué tramo cae cada cuota", () => {
  it("ubica cada número de cuota en su tramo del contrato", () => {
    expect(tramoParaCuota(CONTRATO, 1)?.porcentaje).toBe(25);
    expect(tramoParaCuota(CONTRATO, 2)?.porcentaje).toBe(25);
    expect(tramoParaCuota(CONTRATO, 3)?.porcentaje).toBe(20);
    expect(tramoParaCuota(CONTRATO, 5)?.porcentaje).toBe(10);
    expect(tramoParaCuota(CONTRATO, 6)?.porcentaje).toBe(4);
    expect(tramoParaCuota(CONTRATO, 60)?.porcentaje).toBe(4);
    expect(tramoParaCuota(CONTRATO, 61)?.porcentaje).toBe(2);
  });

  it("el último tramo sin techo cubre hasta la última cuota del plan", () => {
    expect(tramoParaCuota(CONTRATO, 300)?.porcentaje).toBe(2);
  });

  it("si dos tramos se pisan gana el de piso más alto", () => {
    const solapada: TramoAgente[] = [
      { cuotaDesde: 1, cuotaHasta: 10, porcentaje: 25 },
      { cuotaDesde: 5, cuotaHasta: null, porcentaje: 4 },
    ];
    expect(tramoParaCuota(solapada, 7)?.porcentaje).toBe(4);
  });
});

describe("comisión del agente", () => {
  it("agrupa por tramo, no por número de cuota", () => {
    const resultado = calcularComisionAgente({
      cuotas: [...cuotas(1, 2), ...cuotas(2, 3)],
      tramos: CONTRATO,
    });

    // Las cuotas 1 y 2 caen en el mismo tramo: un solo renglón de 5 cuotas.
    expect(resultado.grupos).toHaveLength(1);
    expect(resultado.grupos[0]).toMatchObject({
      cuotaDesde: 1,
      cuotaHasta: 2,
      cantidadCuotas: 5,
      baseCalculo: 5000,
      porcentajeAplicado: 25,
      monto: 1250,
    });
    expect(resultado.totalComision).toBe(1250);
  });

  it("NO tiene tope de cuota 5: la cuota 300 también paga", () => {
    const resultado = calcularComisionAgente({
      cuotas: cuotas(300, 1, 200_000),
      tramos: CONTRATO,
    });

    expect(resultado.cuotasSinTramo).toBe(0);
    // $200.000 al 2 %
    expect(resultado.totalComision).toBe(4000);
  });

  it("liquida un mes completo con cuotas de todos los tramos", () => {
    const resultado = calcularComisionAgente({
      cuotas: [
        ...cuotas(1, 1, 100_000), // 25 % → 25.000
        ...cuotas(4, 1, 100_000), // 20 % → 20.000
        ...cuotas(12, 1, 200_000), //  4 % →  8.000
        ...cuotas(85, 1, 200_000), //  2 % →  4.000
      ],
      tramos: CONTRATO,
    });

    expect(resultado.grupos.map((grupo) => grupo.monto)).toEqual([25_000, 20_000, 8_000, 4_000]);
    expect(resultado.baseCobrada).toBe(600_000);
    expect(resultado.cuotasCobradas).toBe(4);
    expect(resultado.totalComision).toBe(57_000);
    expect(resultado.advertencias).toEqual([]);
  });

  it("una renovación cobra el porcentaje de su cuota real", () => {
    // Una renovación entra por la cuota 5: paga 10 %, no 25 % de venta nueva.
    const resultado = calcularComisionAgente({
      cuotas: cuotas(5, 1, 100_000),
      tramos: CONTRATO,
      renovaciones: 1,
    });

    expect(resultado.totalComision).toBe(10_000);
    expect(resultado.contratos).toBe(1);
  });

  it("no arrastra error al sumar cientos de cuotas con centavos", () => {
    const resultado = calcularComisionAgente({
      cuotas: cuotas(10, 300, 107_293.33),
      tramos: CONTRATO,
    });

    // 300 × 107.293,33 = 32.187.999 al 4 %
    expect(resultado.baseCobrada).toBe(32_187_999);
    expect(resultado.totalComision).toBe(1_287_519.96);
  });

  it("sin escala cargada avisa en vez de inventar un porcentaje", () => {
    const resultado = calcularComisionAgente({ cuotas: cuotas(1, 5), tramos: [] });

    expect(resultado.totalComision).toBe(0);
    expect(resultado.advertencias[0]).toContain("No hay ningún tramo cargado");
  });

  it("una cuota que ningún tramo cubre se cuenta aparte y se avisa", () => {
    const cortada: TramoAgente[] = [{ cuotaDesde: 1, cuotaHasta: 5, porcentaje: 25 }];
    const resultado = calcularComisionAgente({
      cuotas: [...cuotas(1, 1, 100_000), ...cuotas(80, 2, 50_000)],
      tramos: cortada,
    });

    expect(resultado.totalComision).toBe(25_000);
    expect(resultado.cuotasSinTramo).toBe(2);
    expect(resultado.baseSinTramo).toBe(100_000);
    expect(resultado.advertencias[0]).toContain("ningún tramo");
  });
});

describe("objetivo de contratos del mes", () => {
  it("las renovaciones cuentan para el objetivo", () => {
    const resultado = calcularComisionAgente({
      cuotas: cuotas(1, 1),
      tramos: CONTRATO,
      ventasNuevas: 30,
      renovaciones: 20,
      objetivoContratos: 50,
    });

    expect(resultado.contratos).toBe(50);
    expect(resultado.cumpleObjetivo).toBe(true);
    expect(resultado.advertencias).toEqual([]);
  });

  it("si no se llega avisa, pero liquida con la escala completa igual", () => {
    const resultado = calcularComisionAgente({
      cuotas: cuotas(1, 1, 100_000),
      tramos: CONTRATO,
      ventasNuevas: 10,
      renovaciones: 5,
      objetivoContratos: 100,
    });

    expect(resultado.cumpleObjetivo).toBe(false);
    expect(resultado.totalComision).toBe(25_000);
    expect(resultado.advertencias[0]).toContain("15 contrato(s)");
  });

  it("sin objetivo cargado no molesta con avisos", () => {
    const resultado = calcularComisionAgente({
      cuotas: cuotas(1, 1),
      tramos: CONTRATO,
      objetivoContratos: 0,
    });

    expect(resultado.cumpleObjetivo).toBe(true);
    expect(resultado.advertencias).toEqual([]);
  });
});

describe("revisión de la escala del agente", () => {
  it("el contrato vigente no tiene observaciones", () => {
    expect(revisarEscalaAgente(CONTRATO)).toEqual([]);
  });

  it("una escala vacía no genera avisos: todavía no se cargó nada", () => {
    expect(revisarEscalaAgente([])).toEqual([]);
  });

  it("avisa si no arranca en la cuota 1", () => {
    const avisos = revisarEscalaAgente([{ cuotaDesde: 3, cuotaHasta: null, porcentaje: 20 }]);
    expect(avisos[0]).toContain("empiece en 1");
  });

  it("avisa si queda un hueco entre tramos", () => {
    const avisos = revisarEscalaAgente([
      { cuotaDesde: 1, cuotaHasta: 5, porcentaje: 25 },
      { cuotaDesde: 10, cuotaHasta: null, porcentaje: 2 },
    ]);
    expect(avisos.some((aviso) => aviso.includes("hueco"))).toBe(true);
  });

  it("avisa si el último tramo tiene techo: los planes llegan a la 300", () => {
    const avisos = revisarEscalaAgente([
      { cuotaDesde: 1, cuotaHasta: 5, porcentaje: 25 },
      { cuotaDesde: 6, cuotaHasta: 60, porcentaje: 4 },
    ]);
    expect(avisos.some((aviso) => aviso.includes("techo vacío"))).toBe(true);
  });

  it("avisa si dos tramos se pisan", () => {
    const avisos = revisarEscalaAgente([
      { cuotaDesde: 1, cuotaHasta: 10, porcentaje: 25 },
      { cuotaDesde: 5, cuotaHasta: null, porcentaje: 4 },
    ]);
    expect(avisos.some((aviso) => aviso.includes("se pisan"))).toBe(true);
  });
});
