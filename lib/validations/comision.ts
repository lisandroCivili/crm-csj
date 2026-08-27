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

/** Importe en pesos que se carga a mano, de 0 en adelante. */
const importe = z
  .string()
  .trim()
  .transform((valor) => (vacio(valor) ? 0 : aNumero(valor)))
  .refine(
    (valor) => Number.isFinite(valor) && valor >= 0 && valor < 1_000_000_000,
    "El importe tiene que ser un número de 0 en adelante."
  );

const periodo = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "El período tiene formato YYYY-MM.");

/** Importe manual que Balta suma a la comision del periodo. */
export const gastosRepresentacionSchema = z.object({
  vendedorId: z.string().min(1),
  periodo,
  importe,
});

// ---------------------------------------------------------------------------
// Comision del agente
// ---------------------------------------------------------------------------

/**
 * Un tramo del contrato de agencia: desde que numero de cuota hasta cual, y con
 * que porcentaje. Un solo eje, a diferencia del tramo del vendedor: el volumen
 * del mes no mueve el porcentaje.
 */
export const tramoAgenteSchema = z
  .object({
    cuotaDesde: z
      .string()
      .trim()
      .transform((valor) => (vacio(valor) ? NaN : Number(valor)))
      .refine(
        (valor) => Number.isInteger(valor) && valor >= 1 && valor <= 1000,
        "La cuota de inicio tiene que ser un número entero de 1 en adelante."
      ),
    /** Vacio = de ahi en adelante (el ultimo tramo del contrato). */
    cuotaHasta: z
      .string()
      .trim()
      .optional()
      .transform((valor) => (vacio(valor) ? null : Number(valor)))
      .refine(
        (valor) => valor === null || (Number.isInteger(valor) && valor >= 1 && valor <= 1000),
        "La cuota final tiene que ser un número entero, o quedar vacía."
      ),
    porcentaje: z
      .string()
      .trim()
      .transform((valor) => (vacio(valor) ? NaN : aNumero(valor)))
      .refine(
        (valor) => Number.isFinite(valor) && valor >= 0 && valor <= 100,
        "El porcentaje va de 0 a 100."
      ),
  })
  .refine((datos) => datos.cuotaHasta === null || datos.cuotaHasta >= datos.cuotaDesde, {
    path: ["cuotaHasta"],
    message: "La cuota final no puede ser menor que la de inicio.",
  });

/** Contratos por mes que pide el contrato de agencia en esta zona. */
export const objetivoContratosSchema = z.object({
  objetivo: z
    .string()
    .trim()
    .transform((valor) => (vacio(valor) ? NaN : Number(valor)))
    .refine(
      (valor) => Number.isInteger(valor) && valor >= 0 && valor <= 100_000,
      "El objetivo tiene que ser un número entero de 0 en adelante."
    ),
});

/**
 * Gastos de representacion del agente. Van aparte de la comision (Balta,
 * 27/08/2026): el club los paga como reintegro y los aumenta por inflacion.
 */
export const gastosAgenteSchema = z.object({ periodo, importe });
