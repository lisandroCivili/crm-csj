/**
 * Los numeros de cuota por los que se puede cobrar comision. El tope de cada
 * vendedor (`Vendedor.topeCuotasComision`) se mueve dentro de este rango.
 */
export const CUOTAS_COMISIONABLES = [1, 2, 3, 4, 5] as const;

export const TOPE_MAXIMO_CUOTAS = CUOTAS_COMISIONABLES.length;
