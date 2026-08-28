import { describe, expect, it } from "vitest";
import { MAXIMO_ARCHIVOS, ordenarTanda, TAMANIO_MAXIMO_TANDA } from "./tanda";

/**
 * El orden de una tanda decide si un titulo entra como venta nueva o como
 * renovacion, y de ahi salen las comisiones. Es la unica logica de la Fase 9
 * que se puede equivocar en silencio: si el orden se rompe, la importacion no
 * falla, simplemente clasifica mal.
 */

/** Una ficha de archivo con lo unico que mira la regla. */
function archivo(nombre: string, periodo: string | null) {
  return { nombre, periodoDesde: periodo ? new Date(`${periodo}T00:00:00.000Z`) : null };
}

const nombres = (archivos: { nombre: string }[]) => archivos.map((a) => a.nombre);
const ordenar = (archivos: ReturnType<typeof archivo>[]) => ordenarTanda(archivos, (a) => a);

describe("ordenarTanda", () => {
  it("ordena del padrón más viejo al más nuevo", () => {
    const ordenados = ordenar([
      archivo("padron-septiembre.xls", "2026-09-01"),
      archivo("padron-julio.xls", "2026-07-01"),
      archivo("padron-agosto.xls", "2026-08-01"),
    ]);

    expect(nombres(ordenados)).toEqual([
      "padron-julio.xls",
      "padron-agosto.xls",
      "padron-septiembre.xls",
    ]);
  });

  it("el período le gana al nombre del archivo", () => {
    // El explorador de Windows los entrega alfabeticamente, y el nombre que
    // les pone el club no dice el mes: si mandara el nombre, el padron de
    // junio entraria antes que el de marzo.
    const ordenados = ordenar([
      archivo("a-Padron-siscaho-tucu-170.xls", "2026-06-01"),
      archivo("z-Padron-siscaho-tucu-167.xls", "2026-03-01"),
    ]);

    expect(nombres(ordenados)).toEqual([
      "z-Padron-siscaho-tucu-167.xls",
      "a-Padron-siscaho-tucu-170.xls",
    ]);
  });

  it("desempata por nombre cuando dos archivos arrancan el mismo mes", () => {
    const ordenados = ordenar([
      archivo("salta-b.xls", "2026-05-01"),
      archivo("salta-a.xls", "2026-05-01"),
    ]);

    expect(nombres(ordenados)).toEqual(["salta-a.xls", "salta-b.xls"]);
  });

  it("manda al final el archivo sin período", () => {
    // Sin periodo no se puede afirmar que sea el mas viejo, y adelantarlo si
    // podria arruinar la clasificacion de los demas.
    const ordenados = ordenar([
      archivo("sin-fecha.xls", null),
      archivo("junio.xls", "2026-06-01"),
      archivo("mayo.xls", "2026-05-01"),
    ]);

    expect(nombres(ordenados)).toEqual(["mayo.xls", "junio.xls", "sin-fecha.xls"]);
  });

  it("da lo mismo sin importar en qué orden se eligieron los archivos", () => {
    const tanda = [
      archivo("c.xls", "2026-03-01"),
      archivo("a.xls", "2026-01-01"),
      archivo("b.xls", "2026-02-01"),
    ];

    const esperado = ["a.xls", "b.xls", "c.xls"];
    expect(nombres(ordenar(tanda))).toEqual(esperado);
    expect(nombres(ordenar([...tanda].reverse()))).toEqual(esperado);
  });

  it("no toca el arreglo original", () => {
    const tanda = [archivo("b.xls", "2026-02-01"), archivo("a.xls", "2026-01-01")];
    ordenar(tanda);
    expect(nombres(tanda)).toEqual(["b.xls", "a.xls"]);
  });

  it("aguanta la tanda vacía y la de un solo archivo", () => {
    expect(ordenar([])).toEqual([]);
    expect(nombres(ordenar([archivo("uno.xls", "2026-04-01")]))).toEqual(["uno.xls"]);
  });
});

describe("topes de la tanda", () => {
  it("el tope de archivos entra en el bodySizeLimit con padrones reales", () => {
    // Un padron real pesa cerca de 2 MB. Si alguna vez se sube el tope de
    // archivos sin subir el limite de la request, la tanda entera falla antes
    // de llegar a la accion y el mensaje que ve el admin no explica nada.
    const pesoReal = 2 * 1024 * 1024;
    expect(MAXIMO_ARCHIVOS * pesoReal).toBeLessThanOrEqual(TAMANIO_MAXIMO_TANDA);
  });
});
