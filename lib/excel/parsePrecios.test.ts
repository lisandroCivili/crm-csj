import { describe, expect, it } from "vitest";
import { hojaDePrueba } from "./hoja-de-prueba";
import { parsePrecios } from "./parsePrecios";

/**
 * La lista de precios la arma el club o Balta a mano, así que las columnas se
 * detectan por sinónimos igual que en los leads. Lo que más se rompe acá es el
 * código de producto: son tres dígitos y Excel se come los ceros a la izquierda
 * en cuanto la celda quedó como número.
 */

describe("parsePrecios — código de producto", () => {
  it("devuelve los ceros a la izquierda que Excel se comió", () => {
    // El 045 escrito como número llega como 45. Sin el relleno, el plan se
    // crearía con un código que después no matchea con el del padrón.
    const { filas } = parsePrecios(
      hojaDePrueba([
        ["Codigo", "Descripcion", "Precio"],
        [45, "Plan Moto 120", 100000],
      ])
    );
    expect(filas[0].codigoProducto).toBe("045");
  });

  it("deja intacto un código que ya viene con sus tres dígitos", () => {
    const { filas } = parsePrecios(
      hojaDePrueba([
        ["Codigo", "Descripcion", "Precio"],
        ["007", "Plan Auto 330", 250000],
      ])
    );
    expect(filas[0].codigoProducto).toBe("007");
  });

  it("descarta un código que no entra en tres dígitos", () => {
    const { filas, errores } = parsePrecios(
      hojaDePrueba([
        ["Codigo", "Descripcion", "Precio"],
        ["1234", "Plan raro", 100],
        ["007", "Plan Auto", 200],
      ])
    );
    expect(filas).toHaveLength(1);
    expect(errores[0]).toMatchObject({ fila: 2 });
    expect(errores[0].motivo).toMatch(/3 dígitos/);
  });

  it("una fila sin código no se importa", () => {
    const { errores } = parsePrecios(
      hojaDePrueba([
        ["Codigo", "Descripcion", "Precio"],
        [null, "Plan sin código", 100],
      ])
    );
    expect(errores[0].motivo).toMatch(/falta el código/i);
  });
});

describe("parsePrecios — precio", () => {
  it("lee el formato local con punto de miles y coma decimal", () => {
    const { filas } = parsePrecios(
      hojaDePrueba([
        ["Codigo", "Precio"],
        ["007", "1.234.567,89"],
      ])
    );
    expect(filas[0].precio).toBe(1234567.89);
  });

  it("lee también el formato con punto decimal", () => {
    const { filas } = parsePrecios(
      hojaDePrueba([
        ["Codigo", "Precio"],
        ["007", "1234567.89"],
      ])
    );
    expect(filas[0].precio).toBe(1234567.89);
  });

  it("ignora el símbolo de peso y los espacios", () => {
    const { filas } = parsePrecios(
      hojaDePrueba([
        ["Codigo", "Precio"],
        ["007", "$ 250.000"],
      ])
    );
    expect(filas[0].precio).toBe(250000);
  });

  it("un precio de cero o negativo no es un precio", () => {
    const { filas, errores } = parsePrecios(
      hojaDePrueba([
        ["Codigo", "Precio"],
        ["007", 0],
        ["008", -100],
        ["009", 100],
      ])
    );
    expect(filas).toHaveLength(1);
    expect(errores).toHaveLength(2);
    expect(errores[0].motivo).toMatch(/precio no es válido/i);
  });
});

describe("parsePrecios — columnas", () => {
  it("detecta los encabezados por sinónimo", () => {
    const { filas, columnasDetectadas } = parsePrecios(
      hojaDePrueba([
        ["Cod Producto", "Producto", "Valor", "Plazo"],
        ["007", "Plan Auto 330", 250000, 330],
      ])
    );
    expect(columnasDetectadas.codigoProducto).toBe("Cod Producto");
    expect(columnasDetectadas.precio).toBe("Valor");
    expect(filas[0]).toMatchObject({ nombre: "Plan Auto 330", duracionMeses: 330 });
  });

  it("sin código ni precio no es una lista de precios", () => {
    expect(() =>
      parsePrecios(hojaDePrueba([["Vendedor", "Zona"], ["Ana", "Salta"]]))
    ).toThrow(/¿Es una lista de precios\?/);
  });

  it("sin nombre el plan se llama por su código", () => {
    const { filas } = parsePrecios(
      hojaDePrueba([
        ["Codigo", "Precio"],
        ["045", 100000],
      ])
    );
    expect(filas[0].nombre).toBe("Plan 045");
  });

  it("una duración que no es un entero de meses queda sin cargar", () => {
    const { filas } = parsePrecios(
      hojaDePrueba([
        ["Codigo", "Precio", "Meses"],
        ["007", 100, 12.5],
        ["008", 100, null],
      ])
    );
    expect(filas[0].duracionMeses).toBeNull();
    expect(filas[1].duracionMeses).toBeNull();
  });

  it("rechaza un archivo sin filas de datos", () => {
    expect(() => parsePrecios(hojaDePrueba([["Codigo", "Precio"]]))).toThrow(/no tiene filas/i);
  });
});
