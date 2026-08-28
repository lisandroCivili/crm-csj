import * as XLSX from "xlsx";
import { CAMPOS_PERSONALES, type CampoPersonal } from "@/lib/padron/camposCliente";

/** Una fila del padron = una cuota de un titulo en un mes determinado. */
export type FilaPadron = {
  /** Numero de fila en el Excel, para poder reportar errores ubicables. */
  fila: number;
  nomVen: string;
  numSor: string | null;
  numTit: string;
  nombre: string;
  dni: string;
  domicilio: string | null;
  telefono: string | null;
  codPos: string | null;
  localidad: string | null;
  emision: Date;
  numeroCuota: number;
  importe: number;
  /** Vacio en el padron = cuota impaga. */
  fechaPago: Date | null;
  boni: string | null;
  anti: string | null;
  detalle: string | null;
  debitoAutomatico: boolean;
  codDistribucion: string | null;
  nomDistribucion: string | null;
  rescate: number | null;
  cuotasPagas: number | null;
  email: string | null;
};

export type ErrorFila = { fila: number; motivo: string };

export type ResultadoParseo = {
  filas: FilaPadron[];
  errores: ErrorFila[];
  periodoDesde: Date | null;
  periodoHasta: Date | null;
  /** Valores distintos de NomVen, ya normalizados. */
  nomVenEncontrados: string[];
  /**
   * Cuales de los datos personales del cliente venian como columna en el
   * archivo.
   *
   * Sin esto, "la celda esta vacia" y "la columna no existe" llegan iguales
   * (`null` las dos) y la importacion borra el dato en toda la zona cuando el
   * club manda un reporte sin esa columna. Ninguna de las cinco opcionales
   * esta en `COLUMNAS_REQUERIDAS`, asi que puede pasar sin que el archivo se
   * rechace. Ver `lib/padron/camposCliente.ts`.
   */
  columnasPersonales: CampoPersonal[];
};

const COLUMNAS_REQUERIDAS = [
  "nomven",
  "numtit",
  "nombre",
  "dni",
  "emision",
  "cuota",
  "importe",
] as const;

/**
 * `NomVen` viene como texto libre: el mismo vendedor aparece escrito de varias
 * formas. Normalizamos para que las diferencias de espaciado o mayusculas no
 * generen alias distintos, pero conservamos el resto (incluidos los puntos de
 * las abreviaturas) porque cada variante se mapea a mano una sola vez.
 */
export function normalizarNomVen(valor: string): string {
  return valor.trim().replace(/\s+/g, " ").toUpperCase();
}

/**
 * Excel guarda las fechas como dias desde el 30/12/1899. Las columnas de fecha
 * del padron vienen como numeros crudos, sin formato de fecha, asi que la
 * conversion es manual. Se construye en UTC para que el resultado no dependa de
 * la zona horaria del servidor.
 */
function serialADate(serial: number): Date | null {
  if (!Number.isFinite(serial) || serial <= 0) return null;
  const ms = Math.round((serial - 25569) * 86400 * 1000);
  const fecha = new Date(ms);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

function aFecha(valor: unknown): Date | null {
  if (valor instanceof Date) return valor;
  if (typeof valor === "number") return serialADate(valor);
  if (typeof valor === "string" && valor.trim()) {
    const numero = Number(valor);
    if (Number.isFinite(numero)) return serialADate(numero);
  }
  return null;
}

function aTexto(valor: unknown): string | null {
  if (valor === null || valor === undefined) return null;
  const texto = String(valor).trim();
  return texto === "" ? null : texto;
}

function aNumero(valor: unknown): number | null {
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : null;
  const texto = aTexto(valor);
  if (!texto) return null;
  // El Excel puede traer la coma como separador decimal.
  const numero = Number(texto.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(numero) ? numero : null;
}

export function parsePadron(buffer: Buffer): ResultadoParseo {
  const libro = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const hoja = libro.Sheets[libro.SheetNames[0]];

  if (!hoja) {
    throw new Error("El archivo no tiene ninguna hoja de cálculo.");
  }

  const matriz = XLSX.utils.sheet_to_json<unknown[]>(hoja, {
    header: 1,
    raw: true,
    blankrows: false,
  });

  if (matriz.length < 2) {
    throw new Error("El archivo no tiene filas de datos.");
  }

  // Se ubican las columnas por nombre y no por posicion: si el club reordena
  // el reporte, la importacion sigue funcionando.
  const encabezados = (matriz[0] as unknown[]).map((celda) =>
    String(celda ?? "").trim().toLowerCase()
  );
  const indice = (nombre: string) => encabezados.indexOf(nombre.toLowerCase());

  const faltantes = COLUMNAS_REQUERIDAS.filter((columna) => indice(columna) === -1);
  if (faltantes.length > 0) {
    throw new Error(
      `Al archivo le faltan columnas obligatorias: ${faltantes.join(", ")}. ` +
        "¿Es un padrón del club?"
    );
  }

  const col = {
    nomVen: indice("NomVen"),
    numSor: indice("NumSor"),
    numTit: indice("NumTit"),
    nombre: indice("Nombre"),
    dni: indice("DNI"),
    domicilio: indice("Domicilio"),
    telefono: indice("Telefono"),
    codPos: indice("CodPos"),
    localidad: indice("Localidad"),
    emision: indice("Emision"),
    cuota: indice("Cuota"),
    importe: indice("Importe"),
    fchPago: indice("FchPago"),
    boni: indice("Boni"),
    anti: indice("Anti"),
    detalle: indice("Detalle"),
    debAutom: indice("DebAutom"),
    dis: indice("Dis"),
    nomDis: indice("NomDis"),
    rescate: indice("Rescate"),
    cuotasPagas: indice("CuotasPagas"),
    email: indice("Email"),
  };

  const leer = (fila: unknown[], posicion: number): unknown =>
    posicion === -1 ? null : fila[posicion];

  const columnasPersonales = CAMPOS_PERSONALES.filter((campo) => col[campo] !== -1);

  const filas: FilaPadron[] = [];
  const errores: ErrorFila[] = [];
  const nomVenEncontrados = new Set<string>();
  let periodoDesde: Date | null = null;
  let periodoHasta: Date | null = null;

  for (let i = 1; i < matriz.length; i++) {
    const cruda = matriz[i] as unknown[];
    const numeroFila = i + 1;

    const numTit = aTexto(leer(cruda, col.numTit));
    const dni = aTexto(leer(cruda, col.dni));
    const nombre = aTexto(leer(cruda, col.nombre));
    const nomVenCrudo = aTexto(leer(cruda, col.nomVen));
    const emision = aFecha(leer(cruda, col.emision));
    const numeroCuota = aNumero(leer(cruda, col.cuota));
    const importe = aNumero(leer(cruda, col.importe));

    if (!numTit) {
      errores.push({ fila: numeroFila, motivo: "Falta el número de título." });
      continue;
    }
    if (!dni) {
      errores.push({ fila: numeroFila, motivo: "Falta el DNI del cliente." });
      continue;
    }
    if (!nombre) {
      errores.push({ fila: numeroFila, motivo: "Falta el nombre del cliente." });
      continue;
    }
    if (!nomVenCrudo) {
      errores.push({ fila: numeroFila, motivo: "Falta el vendedor (NomVen)." });
      continue;
    }
    if (!emision) {
      errores.push({ fila: numeroFila, motivo: "La emisión no es una fecha válida." });
      continue;
    }
    if (numeroCuota === null || !Number.isInteger(numeroCuota) || numeroCuota <= 0) {
      errores.push({ fila: numeroFila, motivo: "El número de cuota no es válido." });
      continue;
    }

    const nomVen = normalizarNomVen(nomVenCrudo);
    nomVenEncontrados.add(nomVen);

    if (!periodoDesde || emision < periodoDesde) periodoDesde = emision;
    if (!periodoHasta || emision > periodoHasta) periodoHasta = emision;

    filas.push({
      fila: numeroFila,
      nomVen,
      numSor: aTexto(leer(cruda, col.numSor)),
      numTit,
      nombre,
      dni,
      domicilio: aTexto(leer(cruda, col.domicilio)),
      telefono: aTexto(leer(cruda, col.telefono)),
      codPos: aTexto(leer(cruda, col.codPos)),
      localidad: aTexto(leer(cruda, col.localidad)),
      emision,
      numeroCuota,
      importe: importe ?? 0,
      fechaPago: aFecha(leer(cruda, col.fchPago)),
      boni: aTexto(leer(cruda, col.boni)),
      anti: aTexto(leer(cruda, col.anti)),
      detalle: aTexto(leer(cruda, col.detalle)),
      debitoAutomatico: (aTexto(leer(cruda, col.debAutom)) ?? "").toUpperCase() === "SI",
      codDistribucion: aTexto(leer(cruda, col.dis)),
      nomDistribucion: aTexto(leer(cruda, col.nomDis)),
      rescate: aNumero(leer(cruda, col.rescate)),
      cuotasPagas: aNumero(leer(cruda, col.cuotasPagas)),
      email: aTexto(leer(cruda, col.email)),
    });
  }

  return {
    filas,
    errores,
    periodoDesde,
    periodoHasta,
    nomVenEncontrados: [...nomVenEncontrados].sort(),
    columnasPersonales,
  };
}
