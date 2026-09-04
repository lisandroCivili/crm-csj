import * as XLSX from "xlsx";

/**
 * Arma un `.xlsx` en memoria a partir de una matriz de celdas.
 *
 * Existe sólo para los tests de los tres parsers. Se fabrica el archivo en vez
 * de versionar binarios de ejemplo: un `.xlsx` en el repositorio no se puede
 * leer en un diff, nadie sabe qué caso cubre, y el día que haya que agregarle
 * una columna hay que abrirlo con Excel. Acá el caso de prueba **es** el
 * contenido del test.
 *
 * La primera fila son los encabezados. Los parsers ubican las columnas por
 * nombre, así que el orden de la matriz puede cambiar sin romper nada — y eso
 * también se testea.
 */
export function hojaDePrueba(filas: unknown[][]): Buffer {
  const hoja = XLSX.utils.aoa_to_sheet(filas);
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, "Hoja1");
  return XLSX.write(libro, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

/**
 * El serial de Excel para una fecha ISO (`"2026-06-01"`).
 *
 * Excel cuenta días desde el 30/12/1899 y el padrón trae las fechas como
 * números crudos, sin formato. Se usa para escribir los casos de forma legible;
 * al menos un test compara contra un serial literal para no estar verificando
 * la fórmula del parser contra la misma fórmula.
 */
export function serialExcel(iso: string): number {
  return new Date(`${iso}T00:00:00Z`).getTime() / 86_400_000 + 25569;
}
