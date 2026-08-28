import type { NextConfig } from "next";

/**
 * Origenes desde los que se puede entrar al servidor de desarrollo ademas de
 * localhost: el tunel de ngrok con el que se prueba desde el celular, y lo que
 * se agregue en `ORIGENES_DEV` (la IP de la maquina en la red de casa, otro
 * tunel, lo que sea).
 *
 * Sin esto, `next dev` responde 403 a los `/_next/static/chunks/*.js` que pide
 * cualquier host que no sea localhost. La pagina se ve y los links navegan
 * porque eso lo hace el servidor, pero React nunca hidrata: el hamburguesa y el
 * desplegable de perfil quedan muertos y no hay ningun error en pantalla que lo
 * explique. Se reprodujo el 28/08/2026 entrando por un dominio distinto.
 */
const ORIGENES_TUNEL = [
  "*.ngrok-free.app",
  "*.ngrok-free.dev",
  "*.ngrok.app",
  "*.ngrok.io",
  ...(process.env.ORIGENES_DEV?.split(",").map((o) => o.trim()).filter(Boolean) ?? []),
];

const enDesarrollo = process.env.NODE_ENV !== "production";

const nextConfig: NextConfig = {
  allowedDevOrigins: ORIGENES_TUNEL,

  experimental: {
    serverActions: {
      // Los padrones reales pesan cerca de 2 MB y el limite por defecto es 1 MB.
      bodySizeLimit: "25mb",

      // Las server actions comparan el `Origin` contra el `Host`. Si el tunel
      // reescribe el Host (ngrok con `--host-header=rewrite`), los dos dejan de
      // coincidir y toda accion muere con "Invalid Server Actions request":
      // login, cargar venta, importar padron.
      //
      // Va solo en desarrollo a proposito. Esta lista relaja la proteccion CSRF
      // y en produccion no hay ningun tunel: dejarla puesta seria abrirle la
      // puerta a cualquier `*.ngrok-free.app`.
      allowedOrigins: enDesarrollo ? ORIGENES_TUNEL : undefined,
    },
  },
};

export default nextConfig;
