/**
 * LEER UN NÚMERO DE UNA CELDA DE EXCEL
 *
 * Los tres archivos que entran al sistema los arma gente distinta —el club, o
 * Balta a mano— y ninguno declara en qué formato escribe los números. Llegan
 * `1.234.567,89`, `1234567.89`, `$ 250.000` y `250000`, y todos tienen que dar
 * el mismo tipo de resultado.
 *
 * El punto es el caso difícil, porque significa dos cosas opuestas: en
 * `250.000` separa los miles y en `1234.56` es el decimal. `Number()` siempre lo
 * lee como decimal, así que `Number("250.000")` da **250**, y así se importaba
 * un plan de doscientos cincuenta mil pesos como uno de doscientos cincuenta.
 *
 * La regla: si hay coma, la coma es el decimal y los puntos son miles (formato
 * local). Si no hay coma, un punto seguido de **exactamente** tres dígitos es
 * separador de miles — un precio con tres decimales no existe en pesos—; con
 * una o dos cifras después del punto, es decimal.
 */

function finito(numero: number): number | null {
  return Number.isFinite(numero) ? numero : null;
}

export function aNumeroLocal(valor: unknown): number | null {
  if (typeof valor === "number") return finito(valor);

  if (valor === null || valor === undefined) return null;
  const texto = String(valor).trim();
  if (texto === "") return null;

  // Se descarta todo lo que no sea dígito, separador o signo: "$ 250.000" y
  // "250.000 ARS" son el mismo número.
  const limpio = texto.replace(/[^\d.,-]/g, "");
  if (limpio === "" || limpio === "-") return null;

  if (limpio.includes(",")) {
    return finito(Number(limpio.replace(/\./g, "").replace(",", ".")));
  }

  if (/^-?\d{1,3}(\.\d{3})+$/.test(limpio)) {
    return finito(Number(limpio.replace(/\./g, "")));
  }

  return finito(Number(limpio));
}
