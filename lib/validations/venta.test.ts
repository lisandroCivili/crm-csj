import { describe, expect, it } from "vitest";
import { ventaSchema } from "./venta";

/** Una venta valida minima, para ir rompiendo de a un campo. */
function venta(cambios: Record<string, string> = {}) {
  return {
    planId: "plan-1",
    nroSuscripcion: "123456",
    dni: "30123456",
    nombreCliente: "Juan Perez",
    direccion: "Calle Falsa 123, Barrio Centro",
    telefono: "3874112233",
    numeroTitulo: "",
    observacion: "Vendido en la sucursal.",
    ...cambios,
  };
}

describe("ventaSchema", () => {
  it("acepta una venta con numero de suscripcion y observacion", () => {
    expect(ventaSchema.safeParse(venta()).success).toBe(true);
  });

  describe("Nro Suscripcion es obligatorio salvo que haya titulo", () => {
    it("sin suscripcion y sin titulo, no pasa", () => {
      const r = ventaSchema.safeParse(venta({ nroSuscripcion: "", numeroTitulo: "" }));
      expect(r.success).toBe(false);
      if (!r.success) {
        expect(r.error.issues.some((i) => i.path[0] === "nroSuscripcion")).toBe(true);
      }
    });

    it("sin suscripcion pero con titulo, pasa", () => {
      // Es el caso de una venta que se carga cuando el club ya asigno el
      // titulo: el numero de suscripcion ya no identifica nada.
      const r = ventaSchema.safeParse(
        venta({ nroSuscripcion: "", numeroTitulo: "818018", observacion: "" })
      );
      expect(r.success).toBe(true);
    });

    it("con los dos cargados tambien pasa", () => {
      expect(
        ventaSchema.safeParse(venta({ numeroTitulo: "818018" })).success
      ).toBe(true);
    });
  });

  describe("Observacion es obligatoria cuando hay numero de suscripcion", () => {
    it("con suscripcion y sin observacion, no pasa", () => {
      const r = ventaSchema.safeParse(venta({ observacion: "" }));
      expect(r.success).toBe(false);
      if (!r.success) {
        expect(r.error.issues.some((i) => i.path[0] === "observacion")).toBe(true);
      }
    });

    it("sin suscripcion, la observacion queda opcional", () => {
      const r = ventaSchema.safeParse(
        venta({ nroSuscripcion: "", numeroTitulo: "818018", observacion: "" })
      );
      expect(r.success).toBe(true);
    });

    it("una observacion en blanco no cuenta como cargada", () => {
      const r = ventaSchema.safeParse(venta({ observacion: "   " }));
      expect(r.success).toBe(false);
    });
  });

  describe("los campos numericos son identificadores, no cantidades", () => {
    it("guarda el DNI como texto, sin puntos ni espacios", () => {
      const r = ventaSchema.safeParse(venta({ dni: "30.123.456" }));
      expect(r.success).toBe(true);
      if (r.success) expect(r.data.dni).toBe("30123456");
    });

    it("acepta un telefono escrito con espacios y guiones", () => {
      const r = ventaSchema.safeParse(venta({ telefono: "(0387) 415-1234" }));
      expect(r.success).toBe(true);
      if (r.success) expect(r.data.telefono).toBe("03874151234");
    });

    it("no pierde el cero de adelante", () => {
      // Guardarlo como numero convertiria 0387… en 387…, que es otro telefono.
      const r = ventaSchema.safeParse(venta({ telefono: "0387 4151234" }));
      expect(r.success).toBe(true);
      if (r.success) expect(r.data.telefono.startsWith("0")).toBe(true);
    });

    it("rechaza letras en un campo numerico", () => {
      expect(ventaSchema.safeParse(venta({ dni: "30123abc" })).success).toBe(false);
      expect(ventaSchema.safeParse(venta({ telefono: "no tengo" })).success).toBe(false);
    });

    it("los opcionales vacios quedan en null, no en cadena vacia", () => {
      const r = ventaSchema.safeParse(venta({ numeroTitulo: "" }));
      expect(r.success).toBe(true);
      if (r.success) expect(r.data.numeroTitulo).toBeNull();
    });
  });

  describe("los obligatorios de siempre", () => {
    it("exige plan", () => {
      expect(ventaSchema.safeParse(venta({ planId: "" })).success).toBe(false);
    });

    it("exige nombre", () => {
      expect(ventaSchema.safeParse(venta({ nombreCliente: "Ab" })).success).toBe(false);
    });

    it("exige calle, numero y barrio", () => {
      expect(ventaSchema.safeParse(venta({ direccion: "" })).success).toBe(false);
    });
  });
});
