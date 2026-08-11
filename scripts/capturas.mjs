/**
 * Capturas de pantalla de la aplicacion, para revisar el diseno sin tener que
 * ir pantalla por pantalla a mano. Solo para desarrollo.
 *
 *   npm run dev            (en otra terminal)
 *   node scripts/capturas.mjs [carpeta-destino]
 *
 * Las imagenes van a .capturas/, que esta fuera del repositorio.
 */
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const DESTINO = process.argv[2] ?? ".capturas";

const ADMIN = {
  email: process.env.CAPTURA_EMAIL ?? "balta@crm-csj.local",
  password: process.env.CAPTURA_PASSWORD ?? "CambiarEstePassword123",
};

const PANTALLAS = [
  ["dashboard", "/admin/dashboard"],
  ["leads", "/admin/leads"],
  ["clientes", "/admin/clientes"],
  ["padron", "/admin/padron"],
  ["vendedores", "/admin/vendedores"],
  ["ventas", "/admin/ventas"],
  ["planes", "/admin/planes"],
  ["actividad", "/admin/actividad"],
];

await mkdir(DESTINO, { recursive: true });

const navegador = await chromium.launch();
const contexto = await navegador.newContext({
  viewport: { width: 1440, height: 950 },
  deviceScaleFactor: 2,
  locale: "es-AR",
});
const pagina = await contexto.newPage();

// El overlay de desarrollo de Next se superpone a la interfaz y ensucia las
// capturas. En produccion no existe.
const ocultarOverlay = () =>
  pagina
    .addStyleTag({ content: "nextjs-portal { display: none !important }" })
    .catch(() => {});

await pagina.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await ocultarOverlay();
await pagina.screenshot({ path: `${DESTINO}/00-login.png` });

// El login se hace contra la API y no llenando el formulario: si se hace clic
// antes de que hidrate React, el navegador manda un POST nativo y vuelve al
// login sin sesion. La request comparte el frasco de cookies del contexto.
const { csrfToken } = await (await contexto.request.get(`${BASE}/api/auth/csrf`)).json();
await contexto.request.post(`${BASE}/api/auth/callback/credentials`, {
  form: { csrfToken, ...ADMIN, callbackUrl: `${BASE}/` },
  maxRedirects: 0,
});

// El admin tiene que elegir zona antes de poder ver nada. Se toma el id de la
// primera opcion y se pone la cookie directo, en vez de hacer clic y depender
// de que ya haya hidratado.
await pagina.goto(`${BASE}/seleccionar-zona`, { waitUntil: "networkidle" });
await ocultarOverlay();

if (pagina.url().includes("/login")) {
  throw new Error("No se pudo iniciar sesión: revisá las credenciales del script.");
}

await pagina.screenshot({ path: `${DESTINO}/01-zona.png` });

const zonaId = await pagina.getAttribute('form input[name="zonaId"]', "value");
await contexto.addCookies([
  { name: "zona_activa", value: String(zonaId), url: BASE, httpOnly: true, sameSite: "Lax" },
]);

for (const [indice, [nombre, ruta]] of PANTALLAS.entries()) {
  await pagina.goto(`${BASE}${ruta}`, { waitUntil: "networkidle" });
  await ocultarOverlay();
  await pagina.waitForTimeout(500);
  const numero = String(indice + 2).padStart(2, "0");
  await pagina.screenshot({ path: `${DESTINO}/${numero}-${nombre}.png` });
  console.log(`${numero}-${nombre}`);
}

await navegador.close();
console.log(`\nlisto: ${DESTINO}/`);
