import { describe, expect, it } from "vitest";
import {
  CAMPOS_PERSONALES,
  camposQueEscribeElPadron,
  cambiosDelCliente,
  datosDeClienteNuevo,
  type CampoPersonal,
  type DatosPersonales,
} from "./camposCliente";

const TODAS = [...CAMPOS_PERSONALES] as CampoPersonal[];

const delPadron = (parcial: Partial<DatosPersonales> = {}): DatosPersonales => ({
  nombre: "PEREZ JUAN",
  domicilio: "SAN MARTIN 100",
  telefono: "3874000000",
  codPos: "4400",
  localidad: "SALTA",
  email: "juan@ejemplo.com",
  ...parcial,
});

describe("camposQueEscribeElPadron", () => {
  it("con el archivo completo y nada corregido, escribe todos", () => {
    expect(camposQueEscribeElPadron(TODAS, [])).toEqual(TODAS);
  });

  it("no escribe un campo corregido a mano", () => {
    const escribibles = camposQueEscribeElPadron(TODAS, ["telefono"]);
    expect(escribibles).not.toContain("telefono");
    expect(escribibles).toContain("domicilio");
  });

  it("no escribe un campo cuya columna no vino en el archivo", () => {
    const escribibles = camposQueEscribeElPadron(["nombre", "domicilio"], []);
    expect(escribibles).toEqual(["nombre", "domicilio"]);
  });

  it("ignora un campo manual que no existe", () => {
    expect(camposQueEscribeElPadron(TODAS, ["inventado"])).toEqual(TODAS);
  });
});

describe("cambiosDelCliente", () => {
  it("devuelve null cuando el padron no trae ninguna novedad", () => {
    expect(cambiosDelCliente(delPadron(), delPadron(), TODAS)).toBeNull();
  });

  it("devuelve solo los campos que cambiaron, no los seis", () => {
    const cambios = cambiosDelCliente(
      delPadron({ telefono: "3874111111" }),
      delPadron(),
      TODAS
    );
    expect(cambios).toEqual({ telefono: "3874000000" });
  });

  it("respeta el campo corregido a mano aunque el padron traiga otro valor", () => {
    const existente = { ...delPadron({ telefono: "3875999999" }), camposManuales: ["telefono"] };
    expect(cambiosDelCliente(existente, delPadron(), TODAS)).toBeNull();
  });

  it("sigue actualizando el resto cuando un campo esta corregido a mano", () => {
    const existente = {
      ...delPadron({ telefono: "3875999999", domicilio: "VIEJA 1" }),
      camposManuales: ["telefono"],
    };
    expect(cambiosDelCliente(existente, delPadron(), TODAS)).toEqual({
      domicilio: "SAN MARTIN 100",
    });
  });

  it("no borra un dato cuya columna falta en el archivo", () => {
    // El Excel no trae la columna Email: `parsePadron` devuelve null igual que
    // si la celda estuviera vacia, y sin esto se borraba el email de la zona.
    const columnas = TODAS.filter((campo) => campo !== "email");
    const cambios = cambiosDelCliente(
      delPadron(),
      delPadron({ email: null }),
      columnas
    );
    expect(cambios).toBeNull();
  });

  it("si la columna vino y la celda esta vacia, si borra", () => {
    // Esto es lo que distingue "no informado" de "informado como vacio".
    expect(cambiosDelCliente(delPadron(), delPadron({ email: null }), TODAS)).toEqual({
      email: null,
    });
  });

  it("no pisa el nombre con un vacio", () => {
    expect(cambiosDelCliente(delPadron(), delPadron({ nombre: null }), TODAS)).toBeNull();
  });

  it("trata un campo ausente en el existente como null", () => {
    expect(cambiosDelCliente({}, delPadron({ email: null }), ["email"])).toBeNull();
    expect(cambiosDelCliente({}, delPadron(), ["email"])).toEqual({
      email: "juan@ejemplo.com",
    });
  });
});

describe("datosDeClienteNuevo", () => {
  it("copia lo que trae el archivo", () => {
    expect(datosDeClienteNuevo(delPadron(), TODAS)).toEqual(delPadron());
  });

  it("deja en null las columnas que no vinieron", () => {
    const datos = datosDeClienteNuevo(delPadron(), ["nombre", "dni" as CampoPersonal]);
    expect(datos.nombre).toBe("PEREZ JUAN");
    expect(datos.email).toBeNull();
    expect(datos.telefono).toBeNull();
  });

  it("siempre devuelve las seis claves", () => {
    expect(Object.keys(datosDeClienteNuevo(delPadron(), []))).toEqual(TODAS);
  });
});
