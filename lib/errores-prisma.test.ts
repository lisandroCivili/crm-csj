import { describe, expect, it } from "vitest";
import { camposDuplicados, erroresPorDuplicado, esDuplicado } from "./errores-prisma";

/**
 * La forma del error de Prisma no es un detalle interno: es de lo que depende
 * que el formulario diga "ya hay un vendedor con ese DNI" en vez de un
 * "Datos duplicados." que no ayuda a nadie.
 *
 * Los objetos de abajo son capturas textuales de lo que devuelve Prisma 7 con
 * `@prisma/adapter-pg`, que ya no completa `meta.target`.
 */

const P2002_ADAPTER = {
  code: "P2002",
  meta: {
    modelName: "User",
    driverAdapterError: {
      name: "DriverAdapterError",
      cause: {
        originalCode: "23505",
        originalMessage: 'duplicate key value violates unique constraint "usuarios_email_key"',
        kind: "UniqueConstraintViolation",
        constraint: { fields: ["email"] },
      },
    },
  },
};

const P2002_ADAPTER_INDICE = {
  code: "P2002",
  meta: {
    driverAdapterError: { cause: { constraint: { index: "usuarios_email_key" } } },
  },
};

/** Como lo devolvia Prisma sin driver adapter. */
const P2002_CLASICO = { code: "P2002", meta: { target: ["zonaId", "dni"] } };

describe("esDuplicado", () => {
  it("reconoce el P2002", () => {
    expect(esDuplicado(P2002_ADAPTER)).toBe(true);
    expect(esDuplicado({ code: "P2025" })).toBe(false);
    expect(esDuplicado(new Error("otra cosa"))).toBe(false);
  });
});

describe("camposDuplicados", () => {
  it("lee las columnas que informa el driver adapter", () => {
    expect(camposDuplicados(P2002_ADAPTER)).toEqual(["email"]);
  });

  it("acepta el nombre del indice cuando no vienen las columnas", () => {
    expect(camposDuplicados(P2002_ADAPTER_INDICE)).toEqual(["usuarios_email_key"]);
  });

  it("sigue leyendo el `target` clasico", () => {
    expect(camposDuplicados(P2002_CLASICO)).toEqual(["zonaId", "dni"]);
  });

  it("devuelve vacio cuando no se puede saber, nunca [''] ", () => {
    expect(camposDuplicados({ code: "P2002" })).toEqual([]);
    expect(camposDuplicados(new Error("x"))).toEqual([]);
  });
});

describe("erroresPorDuplicado", () => {
  it("marca el email en el alta de la cuenta", () => {
    expect(erroresPorDuplicado(P2002_ADAPTER)).toEqual({
      errores: { email: ["Ya hay una cuenta con ese email."] },
    });
  });

  it("marca el DNI del vendedor", () => {
    expect(erroresPorDuplicado(P2002_CLASICO)).toEqual({
      errores: { dni: ["Ya hay un vendedor con ese DNI."] },
    });
  });

  it("marca el codigo del vendedor", () => {
    const error = {
      code: "P2002",
      meta: { driverAdapterError: { cause: { constraint: { fields: ["zonaId", "codigo"] } } } },
    };
    expect(erroresPorDuplicado(error)).toEqual({
      errores: { codigo: ["Ya hay un vendedor con ese código en esta zona."] },
    });
  });

  it("devuelve null si el choque es de otra cosa, para que decida el llamador", () => {
    const error = {
      code: "P2002",
      meta: { driverAdapterError: { cause: { constraint: { fields: ["numTit"] } } } },
    };
    expect(erroresPorDuplicado(error)).toBeNull();
    expect(erroresPorDuplicado({ code: "P2002" })).toBeNull();
  });
});
