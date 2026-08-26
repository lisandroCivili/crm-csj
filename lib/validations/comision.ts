import { z } from "zod";
import { CUOTAS_COMISIONABLES } from "@/lib/comisiones/constantes";

/**
 * Los numeros se escriben con coma decimal en Argentina, pero el input type
 * number manda punto. Se aceptan las dos formas para que no dependa del teclado
 * ni del navegador.
 */
function aNumero(valor: string): number {
  return Number(valor.replace(",", "."));
}

const vacio = (valor: unknown) => valor === undefined || valor === null || valor === "";

/** Porcentaje de una cuota dentro del tramo. Vacio = no cobra esa cuota. */
const porcentajeOpcional = z
  .string()
  .trim()
  .optional()
  .transform((valor) => (vacio(valor) ? null : aNumero(valor!)))
  .refine(
    (valor) => valor === null || (Number.isFinite(valor) && valor >= 0 && valor <= 100),
    "El porcentaje va de 0 a 100."
  );

const enteroNoNegativo = (etiqueta: string) =>
  z
    .string()
    .trim()
    .transform((valor) => (vacio(valor) ? NaN : Number(valor)))
    .refine(
      (valor) => Number.isInteger(valor) && valor >= 0 && valor <= 100_000,
      `${etiqueta} tiene que ser un número entero de 0 en adelante.`
    );

/**
 * Un tramo de la escala: el piso y techo de ventas nuevas del mes, y el
 * porcentaje que cobra cada numero de cuota dentro de ese tramo.
 *
 * En la base cada combinacion (ventasMin, numeroCuota) es una fila distinta;
 * el formulario las edita juntas porque asi es como se lee la escala.
 */
export const tramoEscalaSchema = z
  .object({
    ventasMin: enteroNoNegativo("El piso de ventas"),
    /** Vacio = sin tope superior (el ultimo tramo de la escala). */
    ventasMax: z
      .string()
      .trim()
      .optional()
      .transform((valor) => (vacio(valor) ? null : Number(valor)))
      .refine(
        (valor) =>
          valor === null || (Number.isInteger(valor) && valor >= 0 && valor <= 100_000),
        "El techo de ventas tiene que ser un número entero, o quedar vacío."
      ),
    porcentaje1: porcentajeOpcional,
    porcentaje2: porcentajeOpcional,
    porcentaje3: porcentajeOpcional,
    porcentaje4: porcentajeOpcional,
    porcentaje5: porcentajeOpcional,
  })
  .refine((datos) => datos.ventasMax === null || datos.ventasMax >= datos.ventasMin, {
    path: ["ventasMax"],
    message: "El techo no puede ser menor que el piso.",
  })
  .refine(
    (datos) => CUOTAS_COMISIONABLES.some((n) => datos[`porcentaje${n}` as const] !== null),
    { path: ["porcentaje1"], message: "Cargá al menos un porcentaje." }
  );

export type DatosTramoEscala = z.infer<typeof tramoEscalaSchema>;

export const nombreEscalaSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, "Ingresá un nombre para la escala.")
    .max(60, "No puede superar los 60 caracteres."),
});

/** Importe manual que Balta suma a la comision del periodo. */
export const gastosRepresentacionSchema = z.object({
  vendedorId: z.string().min(1),
  periodo: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "El período tiene formato YYYY-MM."),
  importe: z
    .string()
    .trim()
    .transform((valor) => (vacio(valor) ? 0 : aNumero(valor)))
    .refine(
      (valor) => Number.isFinite(valor) && valor >= 0 && valor < 1_000_000_000,
      "El importe tiene que ser un número de 0 en adelante."
    ),
});
