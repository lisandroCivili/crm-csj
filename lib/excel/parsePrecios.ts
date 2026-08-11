import * as XLSX from "xlsx";

/**
 * Lista de precios de los planes. Como el archivo lo arma el club (o Balta a
 * mano), las columnas se detectan por sinonimos igual que en los leads, en vez
 * de asumir un orden fijo.
 */

export type FilaPrecio = {
  fila: number;
  /** Codigo de producto de 3 digitos. */
  codigoProducto: string;
  nombre: string;
  precio: number;
  duracionMeses: number | null;
};

export type ErrorFilaPrecio = { fila: number; motivo: string };

export type ResultadoParseoPrecios = {
  filas: FilaPrecio[];
  errores: ErrorFilaPrecio[];
  columnasDetectadas: Record<string, string | null>;
};

const SINONIMOS = {
  codigoProducto: ["codigo de producto", "cod producto", "codigo", "cod", "producto codigo"],
  nombre: ["descripcion", "producto", "plan", "nombre", "detalle"],
  precio: ["precio", "valor", "importe", "monto", "cuota"],
  duracionMeses: ["duracion", "meses", "plazo", "cuotas"],
} as const;

type CampoPrecio = keyof typeof SINONIMOS;

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function aTexto(valor: unknown): string | null {
  if (valor === null || valor === undefined) return null;
  const texto = String(valor).trim();
  return texto === "" ? null : texto;
}

/** Acepta "1.234.567,89" (formato local) y "1234567.89". */
function aNumero(valor: unknown): number | null {
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : null;
  const texto = aTexto(valor);
  if (!texto) return null;

  const limpio = texto.replace(/[^\d.,-]/g, "");
  const usaComaDecimal = /,\d{1,2}$/.test(limpio);
  const numero = Number(
    usaComaDecimal ? limpio.replace(/\./g, "").replace(",", ".") : limpio.replace(/,/g, "")
  );

  return Number.isFinite(numero) ? numero : null;
}

export function parsePrecios(buffer: Buffer): ResultadoParseoPrecios {
  const libro = XLSX.read(buffer, { type: "buffer", raw: false });
  const hoja = libro.Sheets[libro.SheetNames[0]];
  if (!hoja) throw new Error("El archivo no tiene ninguna hoja de cálculo.");

  const matriz = XLSX.utils.sheet_to_json<unknown[]>(hoja, {
    header: 1,
    raw: false,
    blankrows: false,
  });
  if (matriz.length < 2) throw new Error("El archivo no tiene filas de datos.");

  const encabezados = (matriz[0] as unknown[]).map((celda) => String(celda ?? "").trim());
  const normalizados = encabezados.map(normalizar);

  const usadas = new Set<number>();
  const posicion = {} as Record<CampoPrecio, number>;
  const columnasDetectadas: Record<string, string | null> = {};

  for (const campo of Object.keys(SINONIMOS) as CampoPrecio[]) {
    let encontrada = -1;
    for (const sinonimo of SINONIMOS[campo]) {
      const exacta = normalizados.findIndex((h, i) => !usadas.has(i) && h === sinonimo);
      if (exacta !== -1) {
        encontrada = exacta;
        break;
      }
      const parcial = normalizados.findIndex((h, i) => !usadas.has(i) && h.includes(sinonimo));
      if (parcial !== -1) {
        encontrada = parcial;
        break;
      }
    }
    posicion[campo] = encontrada;
    columnasDetectadas[campo] = encontrada === -1 ? null : encabezados[encontrada];
    if (encontrada !== -1) usadas.add(encontrada);
  }

  const faltantes = (["codigoProducto", "precio"] as CampoPrecio[]).filter(
    (campo) => posicion[campo] === -1
  );
  if (faltantes.length > 0) {
    throw new Error(
      "No se encontraron las columnas de código de producto y precio. ¿Es una lista de precios?"
    );
  }

  const filas: FilaPrecio[] = [];
  const errores: ErrorFilaPrecio[] = [];
  const leer = (fila: unknown[], campo: CampoPrecio) =>
    posicion[campo] === -1 ? null : fila[posicion[campo]];

  for (let i = 1; i < matriz.length; i++) {
    const cruda = matriz[i] as unknown[];
    const numeroFila = i + 1;

    const codigoCrudo = aTexto(leer(cruda, "codigoProducto"));
    const precio = aNumero(leer(cruda, "precio"));

    if (!codigoCrudo) {
      errores.push({ fila: numeroFila, motivo: "Falta el código de producto." });
      continue;
    }

    // Los codigos son de 3 digitos; Excel se come los ceros a la izquierda
    // cuando la celda quedo como numero (el 045 llega como 45).
    const codigoProducto = codigoCrudo.replace(/\D/g, "").padStart(3, "0");
    if (codigoProducto.length !== 3) {
      errores.push({
        fila: numeroFila,
        motivo: `El código "${codigoCrudo}" no es de 3 dígitos.`,
      });
      continue;
    }

    if (precio === null || precio <= 0) {
      errores.push({ fila: numeroFila, motivo: "El precio no es válido." });
      continue;
    }

    const duracion = aNumero(leer(cruda, "duracionMeses"));

    filas.push({
      fila: numeroFila,
      codigoProducto,
      nombre: aTexto(leer(cruda, "nombre")) ?? `Plan ${codigoProducto}`,
      precio,
      duracionMeses: duracion && Number.isInteger(duracion) ? duracion : null,
    });
  }

  return { filas, errores, columnasDetectadas };
}
