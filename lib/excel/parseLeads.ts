import * as XLSX from "xlsx";

/**
 * Los exports de Meta Ads no tienen un formato fijo: los encabezados cambian
 * segun como se armo el formulario, vienen en ingles o en espanol, y las
 * preguntas personalizadas aparecen con el texto completo de la pregunta. Por
 * eso las columnas se detectan por sinonimos en vez de por posicion, y el
 * resultado se le muestra al admin antes de confirmar la importacion.
 */

export type FilaLead = {
  fila: number;
  nombre: string;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  localidad: string | null;
  provincia: string | null;
};

export type ErrorFilaLead = { fila: number; motivo: string };

export type CampoLead = keyof Omit<FilaLead, "fila">;

export type ResultadoParseoLeads = {
  filas: FilaLead[];
  errores: ErrorFilaLead[];
  /** Que encabezado del archivo se uso para cada campo. */
  columnasDetectadas: Record<CampoLead, string | null>;
  /** Encabezados del archivo que no se mapearon a ningun campo. */
  columnasIgnoradas: string[];
};

/** Sinonimos por campo, del mas especifico al mas generico. */
const SINONIMOS: Record<CampoLead, string[]> = {
  nombre: ["nombre completo", "full name", "nombre y apellido", "fullname", "nombre", "name"],
  telefono: ["phone number", "telefono", "celular", "whatsapp", "phone", "tel", "movil"],
  email: ["email", "correo electronico", "correo", "mail"],
  direccion: ["street address", "direccion", "domicilio", "calle", "address"],
  localidad: ["city", "ciudad", "localidad", "town"],
  provincia: ["province", "provincia", "state", "region"],
};

/** Quita acentos y signos para que "Teléfono", "telefono" y "TELEFONO" coincidan. */
function normalizarEncabezado(texto: string): string {
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

/**
 * Clave para comparar telefonos escritos de distinta forma. El mismo numero
 * llega como "+54 387 411-2233", "+549 387 4112233" o "0387 4112233": todos
 * comparten los ultimos 10 digitos (codigo de area + abonado), que es lo que
 * realmente identifica la linea. Quedarse con esos 10 neutraliza el prefijo de
 * pais, el 9 de celular y el 0 de larga distancia sin tener que adivinar cuanto
 * mide cada codigo de area.
 */
export function claveTelefono(telefono: string | null): string {
  const digitos = (telefono ?? "").replace(/\D/g, "");
  return digitos.length > 10 ? digitos.slice(-10) : digitos;
}

export function parseLeads(buffer: Buffer): ResultadoParseoLeads {
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
  const normalizados = encabezados.map(normalizarEncabezado);

  // Cada columna se asigna a un solo campo: se recorre campo por campo y se
  // toma la primera columna libre que coincida con alguno de sus sinonimos.
  const usadas = new Set<number>();
  const posicion = {} as Record<CampoLead, number>;
  const columnasDetectadas = {} as Record<CampoLead, string | null>;

  for (const campo of Object.keys(SINONIMOS) as CampoLead[]) {
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

  if (posicion.nombre === -1 && posicion.telefono === -1) {
    throw new Error(
      "No se encontró ninguna columna de nombre ni de teléfono. " +
        "¿Es un archivo de leads?"
    );
  }

  const filas: FilaLead[] = [];
  const errores: ErrorFilaLead[] = [];

  const leer = (fila: unknown[], campo: CampoLead): string | null =>
    posicion[campo] === -1 ? null : aTexto(fila[posicion[campo]]);

  for (let i = 1; i < matriz.length; i++) {
    const cruda = matriz[i] as unknown[];
    const numeroFila = i + 1;

    const nombre = leer(cruda, "nombre");
    const telefono = leer(cruda, "telefono");

    // Un lead sin nombre ni telefono no se puede trabajar.
    if (!nombre && !telefono) {
      errores.push({ fila: numeroFila, motivo: "No tiene nombre ni teléfono." });
      continue;
    }

    filas.push({
      fila: numeroFila,
      nombre: nombre ?? "Sin nombre",
      telefono,
      email: leer(cruda, "email"),
      direccion: leer(cruda, "direccion"),
      localidad: leer(cruda, "localidad"),
      provincia: leer(cruda, "provincia"),
    });
  }

  return {
    filas,
    errores,
    columnasDetectadas,
    columnasIgnoradas: encabezados.filter((_, i) => !usadas.has(i) && encabezados[i] !== ""),
  };
}
