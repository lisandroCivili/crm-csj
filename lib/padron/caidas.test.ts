import { describe, expect, it } from "vitest";
import {
  calcularEstadoCaida,
  contradiceAlClub,
  estadoCaidaDelCliente,
  IMPAGAS_PARA_CAIDA,
} from "./caidas";

/**
 * Arma un historico contiguo desde `desde`. Cada caracter es una cuota:
 * `P` paga, `-` impaga. Se escribe en orden de numeracion, asi que la ultima
 * letra es la cuota mas alta, que es donde vive la racha que decide todo.
 */
function historico(desde: number, patron: string) {
  return [...patron].map((caracter, i) => ({
    numeroCuota: desde + i,
    pagada: caracter === "P",
  }));
}

describe("calcularEstadoCaida", () => {
  it("un titulo al dia no esta caido ni en riesgo", () => {
    const estado = calcularEstadoCaida(historico(1, "PPPPPPPP"));

    expect(estado.impagasConsecutivas).toBe(0);
    expect(estado.cuotaUltimaPaga).toBe(8);
    expect(estado.caido).toBe(false);
    expect(estado.enRiesgo).toBe(false);
    expect(estado.confiable).toBe(true);
  });

  it("con 6 impagas consecutivas se cae", () => {
    // La regla de Balta: 6 seguidas sin pagar.
    const estado = calcularEstadoCaida(historico(10, "PPP------"));

    expect(estado.impagasConsecutivas).toBe(6);
    expect(estado.caido).toBe(true);
    expect(estado.cuotaUltimaPaga).toBe(12);
  });

  it("con 5 impagas todavia no se cae, pero esta en riesgo", () => {
    const estado = calcularEstadoCaida(historico(10, "PPP-----"));

    expect(estado.impagasConsecutivas).toBe(5);
    expect(estado.caido).toBe(false);
    expect(estado.enRiesgo).toBe(true);
    expect(estado.confiable).toBe(true);
  });

  it("el riesgo arranca en la tercera impaga", () => {
    expect(calcularEstadoCaida(historico(10, "PP--")).enRiesgo).toBe(false);
    expect(calcularEstadoCaida(historico(10, "PP---")).enRiesgo).toBe(true);
  });

  it("un pago posterior corta la racha aunque haya muchas impagas antes", () => {
    // Se atraso 7 meses y se puso al dia: no esta caido.
    const estado = calcularEstadoCaida(historico(1, "P-------PP"));

    expect(estado.impagasConsecutivas).toBe(0);
    expect(estado.caido).toBe(false);
    expect(estado.cuotaUltimaPaga).toBe(10);
  });

  it("solo cuenta la racha del final, no el total de impagas", () => {
    // 8 impagas en total, pero repartidas: ninguna racha llega a 6.
    const estado = calcularEstadoCaida(historico(1, "P----P----P--"));

    expect(estado.impagasConsecutivas).toBe(2);
    expect(estado.caido).toBe(false);
  });

  it("no depende del orden en que vengan las cuotas", () => {
    const desordenadas = [
      { numeroCuota: 15, pagada: false },
      { numeroCuota: 11, pagada: true },
      { numeroCuota: 13, pagada: false },
      { numeroCuota: 12, pagada: false },
      { numeroCuota: 14, pagada: false },
    ];

    const estado = calcularEstadoCaida(desordenadas);

    expect(estado.impagasConsecutivas).toBe(4);
    expect(estado.cuotaMinConocida).toBe(11);
    expect(estado.cuotaMaxConocida).toBe(15);
    expect(estado.confiable).toBe(true);
  });

  describe("cuando el historico no alcanza", () => {
    it("un titulo sin cuotas no dice nada", () => {
      const estado = calcularEstadoCaida([]);

      expect(estado.confiable).toBe(false);
      expect(estado.caido).toBe(false);
      expect(estado.cuotaMinConocida).toBeNull();
    });

    it("una racha que llega al borde del historico no es confiable", () => {
      // Solo se conocen las cuotas 40 a 43, todas impagas. La racha real
      // podria ser mucho mas larga: lo unico honesto es no afirmarlo.
      const estado = calcularEstadoCaida(historico(40, "----"));

      expect(estado.impagasConsecutivas).toBe(4);
      expect(estado.caido).toBe(false);
      expect(estado.confiable).toBe(false);
    });

    it("pero si ya llego al umbral, que falte historico no lo desmiente", () => {
      // Mas impagas hacia atras solo alargarian la racha.
      const estado = calcularEstadoCaida(historico(40, "------"));

      expect(estado.impagasConsecutivas).toBe(IMPAGAS_PARA_CAIDA);
      expect(estado.caido).toBe(true);
      expect(estado.confiable).toBe(true);
    });

    it("llegar hasta la cuota 1 cierra la racha: no hay nada antes", () => {
      const estado = calcularEstadoCaida(historico(1, "----"));

      expect(estado.impagasConsecutivas).toBe(4);
      expect(estado.caido).toBe(false);
      expect(estado.confiable).toBe(true);
    });

    it("un hueco en la numeracion corta la racha y la deja sin confirmar", () => {
      // Falta la cuota 12: pudo estar paga. Contarla como impaga inventaria
      // una caida que no consta.
      const estado = calcularEstadoCaida([
        { numeroCuota: 10, pagada: false },
        { numeroCuota: 11, pagada: false },
        // 12 nunca se importo
        { numeroCuota: 13, pagada: false },
        { numeroCuota: 14, pagada: false },
      ]);

      expect(estado.impagasConsecutivas).toBe(2);
      expect(estado.caido).toBe(false);
      expect(estado.confiable).toBe(false);
    });

    it("un hueco lejano no molesta si la racha se cierra antes", () => {
      const estado = calcularEstadoCaida([
        { numeroCuota: 3, pagada: true },
        // hueco viejo, irrelevante
        { numeroCuota: 20, pagada: true },
        { numeroCuota: 21, pagada: false },
        { numeroCuota: 22, pagada: false },
      ]);

      expect(estado.impagasConsecutivas).toBe(2);
      expect(estado.confiable).toBe(true);
    });
  });
});

describe("contradiceAlClub", () => {
  it("avisa cuando el club lo da al dia y nosotros vemos impagas", () => {
    expect(
      contradiceAlClub({ cuotasPagas: 24, cuotaMaxConocida: 24, impagasConsecutivas: 3 })
    ).toBe(true);
  });

  it("no avisa si el club tambien lo da atrasado", () => {
    expect(
      contradiceAlClub({ cuotasPagas: 18, cuotaMaxConocida: 24, impagasConsecutivas: 6 })
    ).toBe(false);
  });

  it("no avisa si no hay impagas", () => {
    expect(
      contradiceAlClub({ cuotasPagas: 24, cuotaMaxConocida: 24, impagasConsecutivas: 0 })
    ).toBe(false);
  });

  it("sin el dato del club no hay nada que contrastar", () => {
    expect(
      contradiceAlClub({ cuotasPagas: null, cuotaMaxConocida: 24, impagasConsecutivas: 6 })
    ).toBe(false);
  });
});

describe("estadoCaidaDelCliente", () => {
  const caido = { caido: true, impagasConsecutivas: 7 };
  const alDia = { caido: false, impagasConsecutivas: 0 };
  const enRiesgo = { caido: false, impagasConsecutivas: 4 };

  it("todos los titulos caidos es caida total", () => {
    expect(estadoCaidaDelCliente([caido, caido])).toBe("TOTAL");
  });

  it("un solo titulo y esta caido tambien es total", () => {
    expect(estadoCaidaDelCliente([caido])).toBe("TOTAL");
  });

  it("algunos caidos y otros no es caida parcial", () => {
    // El caso de GINA PRUEBA en los padrones de prueba.
    expect(estadoCaidaDelCliente([caido, alDia])).toBe("PARCIAL");
  });

  it("un titulo en riesgo no es caida, pero se marca", () => {
    expect(estadoCaidaDelCliente([enRiesgo, alDia])).toBe("RIESGO");
  });

  it("el riesgo no le gana a la caida parcial", () => {
    expect(estadoCaidaDelCliente([caido, enRiesgo])).toBe("PARCIAL");
  });

  it("sin titulos no hay nada que informar", () => {
    expect(estadoCaidaDelCliente([])).toBe("AL_DIA");
  });
});
