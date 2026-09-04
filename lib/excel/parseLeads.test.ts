import { describe, expect, it } from "vitest";
import { hojaDePrueba } from "./hoja-de-prueba";
import { claveTelefono, parseLeads } from "./parseLeads";

/**
 * Los exports de Meta Ads no tienen formato fijo: los encabezados cambian según
 * cómo se armó el formulario, vienen en inglés o en español, y las preguntas
 * personalizadas aparecen con el texto completo. Por eso las columnas se
 * detectan por sinónimos, y por eso hace falta probarlo.
 */

describe("claveTelefono", () => {
  it("el mismo número escrito de seis formas da la misma clave", () => {
    // Es lo único que impide cargar seis veces al mismo interesado.
    const formas = [
      "+54 387 411-2233",
      "+549 387 4112233",
      "0387 4112233",
      "387 411 2233",
      "(0387) 411-2233",
      "543874112233",
    ];
    const claves = new Set(formas.map(claveTelefono));
    expect(claves).toEqual(new Set(["3874112233"]));
  });

  it("un número corto se compara entero, sin rellenar", () => {
    expect(claveTelefono("4112233")).toBe("4112233");
  });

  it("sin teléfono la clave es vacía", () => {
    expect(claveTelefono(null)).toBe("");
    expect(claveTelefono("sin datos")).toBe("");
  });

  it("dos líneas distintas no colisionan", () => {
    expect(claveTelefono("+54 387 4112233")).not.toBe(claveTelefono("+54 381 4112233"));
  });
});

describe("parseLeads — detección de columnas", () => {
  it("reconoce los encabezados en inglés de Meta", () => {
    const { filas, columnasDetectadas } = parseLeads(
      hojaDePrueba([
        ["full_name", "phone_number", "email", "city"],
        ["Ana Prueba", "+54 387 4112233", "ana@ejemplo.com", "Salta"],
      ])
    );
    expect(columnasDetectadas.nombre).toBe("full_name");
    expect(columnasDetectadas.telefono).toBe("phone_number");
    expect(columnasDetectadas.localidad).toBe("city");
    expect(filas[0].nombre).toBe("Ana Prueba");
  });

  it("reconoce los encabezados en español y con acentos", () => {
    const { columnasDetectadas } = parseLeads(
      hojaDePrueba([
        ["Nombre completo", "Teléfono", "Correo electrónico", "Provincia"],
        ["Ana", "3874112233", "a@b.com", "Salta"],
      ])
    );
    expect(columnasDetectadas.nombre).toBe("Nombre completo");
    expect(columnasDetectadas.telefono).toBe("Teléfono");
    expect(columnasDetectadas.email).toBe("Correo electrónico");
  });

  it("una columna se usa para un solo campo", () => {
    // "email" y "correo" caen los dos en el campo email; el segundo tiene que
    // quedar ignorado y no pisar al primero.
    const { columnasDetectadas, columnasIgnoradas } = parseLeads(
      hojaDePrueba([
        ["Nombre", "Email", "Correo"],
        ["Ana", "a@b.com", "otro@b.com"],
      ])
    );
    expect(columnasDetectadas.email).toBe("Email");
    expect(columnasIgnoradas).toContain("Correo");
  });

  it("lista las columnas que no se mapearon a nada", () => {
    const { columnasIgnoradas } = parseLeads(
      hojaDePrueba([
        ["Nombre", "¿Cuándo querés que te llamemos?", "Campaign ID"],
        ["Ana", "A la tarde", "123"],
      ])
    );
    expect(columnasIgnoradas).toEqual(["¿Cuándo querés que te llamemos?", "Campaign ID"]);
  });

  it("rechaza un archivo que no tiene ni nombre ni teléfono", () => {
    expect(() =>
      parseLeads(hojaDePrueba([["Campaign", "Ad Set"], ["x", "y"]]))
    ).toThrow(/¿Es un archivo de leads\?/);
  });

  it("rechaza un archivo sin filas de datos", () => {
    expect(() => parseLeads(hojaDePrueba([["Nombre", "Telefono"]]))).toThrow(/no tiene filas/i);
  });
});

describe("parseLeads — filas", () => {
  it("un lead sin nombre ni teléfono no se puede trabajar", () => {
    const { filas, errores } = parseLeads(
      hojaDePrueba([
        ["Nombre", "Telefono", "Email"],
        ["Ana", "3874112233", "a@b.com"],
        [null, null, "solo@email.com"],
      ])
    );
    expect(filas).toHaveLength(1);
    expect(errores).toEqual([{ fila: 3, motivo: "No tiene nombre ni teléfono." }]);
  });

  it("con teléfono pero sin nombre entra como Sin nombre", () => {
    // Se puede llamar igual, que es lo que importa.
    const { filas, errores } = parseLeads(
      hojaDePrueba([
        ["Nombre", "Telefono"],
        [null, "3874112233"],
      ])
    );
    expect(errores).toHaveLength(0);
    expect(filas[0]).toMatchObject({ nombre: "Sin nombre", telefono: "3874112233" });
  });

  it("los campos que no vinieron quedan en null", () => {
    const { filas } = parseLeads(
      hojaDePrueba([
        ["Nombre", "Telefono"],
        ["Ana", "3874112233"],
      ])
    );
    expect(filas[0]).toMatchObject({
      email: null,
      direccion: null,
      localidad: null,
      provincia: null,
    });
  });

  it("las celdas vacías o con espacios quedan en null, no en cadena vacía", () => {
    const { filas } = parseLeads(
      hojaDePrueba([
        ["Nombre", "Telefono", "Email"],
        ["Ana", "3874112233", "   "],
      ])
    );
    expect(filas[0].email).toBeNull();
  });
});
