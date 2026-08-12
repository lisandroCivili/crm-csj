import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Solo se testea `lib/`: ahi vive la logica que no depende de React ni de la
// base. El motor de comisiones es funcion pura justamente para poder correrlo
// aca sin levantar nada.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
});
