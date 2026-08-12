/**
 * Formatos compartidos de las pantallas.
 *
 * Los importes se muestran sin decimales cuando son redondos y con centavos
 * cuando los tienen: una comision de $ 77.184 se lee de un vistazo, y una de
 * $ 50.000,25 no esconde los centavos que despues hay que pagar.
 */
const PESOS = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function pesos(valor: number): string {
  return PESOS.format(valor);
}

const PORCENTAJE = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 3 });

export function porcentaje(valor: number): string {
  return `${PORCENTAJE.format(valor)} %`;
}
