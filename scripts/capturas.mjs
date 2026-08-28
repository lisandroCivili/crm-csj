/**
 * Capturas de pantalla de la aplicacion, para revisar el diseno sin tener que
 * ir pantalla por pantalla a mano. Solo para desarrollo.
 *
 *   npm run dev            (en otra terminal)
 *   node scripts/capturas.mjs [carpeta-destino]
 *   CAPTURA_MOVIL=1 node scripts/capturas.mjs .capturas-movil
 *
 * El modo movil usa el viewport de un iPhone 14 y abre el menu hamburguesa,
 * que es la unica forma de navegar por debajo de 768px. En las dos variantes
 * mide el desplazamiento horizontal de cada pantalla y nombra al elemento que
 * lo causa.
 *
 * Las imagenes van a .capturas/, que esta fuera del repositorio.
 */
import { mkdir } from "node:fs/promises";
import { chromium, devices } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const MOVIL = process.env.CAPTURA_MOVIL === "1";
const DESTINO = process.argv[2] ?? (MOVIL ? ".capturas-movil" : ".capturas");

const ADMIN = {
  email: process.env.CAPTURA_EMAIL ?? "balta@crm-csj.local",
  password: process.env.CAPTURA_PASSWORD ?? "CambiarEstePassword123",
};

const PANTALLAS = [
  ["dashboard", "/admin/dashboard"],
  ["leads", "/admin/leads"],
  ["clientes", "/admin/clientes"],
  ["padron", "/admin/padron"],
  ["padron-importar", "/admin/padron/importar"],
  ["vendedores", "/admin/vendedores"],
  ["ventas", "/admin/ventas"],
  ["planes", "/admin/planes"],
  ["comisiones", "/admin/comisiones"],
  ["comisiones-escalas", "/admin/comisiones/escalas"],
  ["actividad", "/admin/actividad"],
];

await mkdir(DESTINO, { recursive: true });

const navegador = await chromium.launch();
const contexto = await navegador.newContext({
  ...(MOVIL
    ? devices["iPhone 14"]
    : { viewport: { width: 1440, height: 950 }, deviceScaleFactor: 2 }),
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

/**
 * Busca lo que se sale por el costado. En el telefono un solo elemento ancho
 * hace que toda la pagina se corra en horizontal, y desde afuera eso se ve como
 * "el CRM esta roto en el celular", sin ninguna pista de quien lo causa.
 *
 * Apaga el `overflow-x: clip` de `globals.css` antes de medir: esa es la red de
 * contencion que evita que el desborde se note, y con ella puesta `scrollWidth`
 * no acusa nada nunca. La idea es ver justamente lo que la red tapa.
 */
const medirDesborde = () =>
  pagina.evaluate(() => {
    const raiz = document.documentElement;
    const previo = [raiz.style.overflowX, document.body.style.overflowX];
    raiz.style.overflowX = "visible";
    document.body.style.overflowX = "visible";

    const ancho = raiz.clientWidth;
    const sobra = raiz.scrollWidth - ancho;
    const culpables = [];

    if (sobra > 0) {
      // Lo que vive dentro de algo que scrollea solo no cuenta: la tabla ancha
      // metida en un contenedor con `overflow-x: auto` esta bien resuelta.
      const contenido = (el) => {
        for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
          const ox = getComputedStyle(p).overflowX;
          if (ox === "auto" || ox === "scroll" || ox === "hidden" || ox === "clip") return true;
        }
        return false;
      };

      const nodos = [];
      for (const el of document.body.querySelectorAll("*")) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.right <= ancho + 1) continue;
        if (contenido(el)) continue;
        // Solo el mas externo de cada rama: si el padre ya se sale, listar a
        // todos sus hijos no agrega informacion.
        if (nodos.some((n) => n.contains(el))) continue;
        nodos.push(el);
      }

      for (const el of nodos.slice(0, 5)) {
        const clases =
          typeof el.className === "string" ? el.className.trim().split(/\s+/).slice(0, 6) : [];
        culpables.push(
          `${el.tagName.toLowerCase()}${clases.length ? "." + clases.join(".") : ""}` +
            ` (llega a ${Math.round(el.getBoundingClientRect().right)}px)`
        );
      }
    }

    raiz.style.overflowX = previo[0];
    document.body.style.overflowX = previo[1];
    return { ancho, sobra, culpables };
  });

const desbordes = [];

for (const [indice, [nombre, ruta]] of PANTALLAS.entries()) {
  await pagina.goto(`${BASE}${ruta}`, { waitUntil: "networkidle" });
  await ocultarOverlay();
  await pagina.waitForTimeout(500);
  const numero = String(indice + 2).padStart(2, "0");
  await pagina.screenshot({ path: `${DESTINO}/${numero}-${nombre}.png` });

  const { ancho, sobra, culpables } = await medirDesborde();
  if (sobra > 0) desbordes.push({ nombre, ruta, ancho, sobra, culpables });
  console.log(`${numero}-${nombre}${sobra > 0 ? `   ← se sale ${sobra}px` : ""}`);
}

// En movil la navegacion vive detras del boton: sin esta captura no se ve.
if (MOVIL) {
  await pagina.getByRole("button", { name: "Abrir menú" }).click();
  await pagina.waitForTimeout(400);
  await pagina.screenshot({ path: `${DESTINO}/99-menu.png` });
  console.log("99-menu");
}

await navegador.close();

if (desbordes.length) {
  console.log(`\n⚠  ${desbordes.length} pantalla(s) se salen por el costado:\n`);
  for (const d of desbordes) {
    console.log(`  ${d.ruta}   (viewport ${d.ancho}px, sobran ${d.sobra}px)`);
    for (const c of d.culpables) console.log(`      ${c}`);
  }
} else {
  console.log("\nNinguna pantalla se sale por el costado.");
}

console.log(`\nlisto: ${DESTINO}/`);
