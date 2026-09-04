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

/**
 * La cuenta del vendedor de demo. La crea `scripts/sembrar-demo.ts`; si no
 * está, sus pantallas se saltean con un aviso en vez de romper la corrida.
 */
const VENDEDOR = {
  email: process.env.CAPTURA_EMAIL_VENDEDOR ?? "vendedor@crm-csj.local",
  password: process.env.CAPTURA_PASSWORD_VENDEDOR ?? "CambiarEstePassword123",
};

const PANTALLAS = [
  ["dashboard", "/admin/dashboard"],
  ["leads", "/admin/leads"],
  ["clientes", "/admin/clientes"],
  ["padron", "/admin/padron"],
  ["padron-importar", "/admin/padron/importar"],
  ["vendedores", "/admin/vendedores"],
  ["ventas", "/admin/ventas"],
  ["ventas-nueva", "/admin/ventas/nueva"],
  ["planes", "/admin/planes"],
  ["comisiones", "/admin/comisiones"],
  ["comisiones-escalas", "/admin/comisiones/escalas"],
  ["comisiones-agente", "/admin/comisiones/agente"],
  ["comisiones-agente-escala", "/admin/comisiones/agente/escala"],
  ["actividad", "/admin/actividad"],
  ["laboratorio", "/admin/laboratorio"],
  ["perfil", "/perfil"],
];

/**
 * Las fichas de detalle. No se pueden listar con una ruta fija —dependen de qué
 * haya cargado— así que el id sale del primer link del listado. Nunca se habían
 * mirado, y son las pantallas con más datos por renglón: el mejor lugar para
 * que algo se salga por el costado en el celular.
 */
const DETALLES = [
  ["cliente", "/admin/clientes", "/admin/clientes/"],
  ["vendedor", "/admin/vendedores", "/admin/vendedores/"],
  ["venta", "/admin/ventas", "/admin/ventas/"],
];

/** Lo que ve el vendedor. Hasta la Fase 14 no se capturaba ninguna. */
const PANTALLAS_VENDEDOR = [
  ["vendedor-dashboard", "/vendedor/dashboard"],
  ["vendedor-leads", "/vendedor/leads"],
  ["vendedor-ventas", "/vendedor/ventas"],
  ["vendedor-venta-nueva", "/vendedor/ventas/nueva"],
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
const ocultarOverlayDe = (pag) =>
  pag
    .addStyleTag({ content: "nextjs-portal { display: none !important }" })
    .catch(() => {});

const ocultarOverlay = () => ocultarOverlayDe(pagina);

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
const medirDesbordeDe = (pag) =>
  pag.evaluate(() => {
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
let siguiente = 2;

async function capturar(pag, nombre, ruta) {
  await pag.goto(`${BASE}${ruta}`, { waitUntil: "networkidle" });
  await ocultarOverlayDe(pag);
  await pag.waitForTimeout(500);
  const numero = String(siguiente++).padStart(2, "0");
  await pag.screenshot({ path: `${DESTINO}/${numero}-${nombre}.png` });

  const { ancho, sobra, culpables } = await medirDesbordeDe(pag);
  if (sobra > 0) desbordes.push({ nombre, ruta, ancho, sobra, culpables });
  console.log(`${numero}-${nombre}${sobra > 0 ? `   ← se sale ${sobra}px` : ""}`);
}

for (const [nombre, ruta] of PANTALLAS) {
  await capturar(pagina, nombre, ruta);
}

// Las fichas de detalle: el id sale del primer link del listado, porque depende
// de lo que haya cargado en la base.
for (const [nombre, listado, prefijo] of DETALLES) {
  await pagina.goto(`${BASE}${listado}`, { waitUntil: "networkidle" });
  const href = await pagina
    .locator(`a[href^="${prefijo}"]:not([href$="/editar"]):not([href$="/nueva"])`)
    .first()
    .getAttribute("href")
    .catch(() => null);

  if (!href) {
    console.log(`   (sin ${nombre} cargado: se saltea su ficha)`);
    continue;
  }
  await capturar(pagina, `ficha-${nombre}`, href);
}

// En movil la navegacion vive detras del boton: sin esta captura no se ve.
if (MOVIL) {
  await pagina.goto(`${BASE}/admin/dashboard`, { waitUntil: "networkidle" });
  await ocultarOverlay();
  await pagina.getByRole("button", { name: "Abrir menú" }).click();
  await pagina.waitForTimeout(400);
  await pagina.screenshot({ path: `${DESTINO}/90-menu.png` });
  console.log("90-menu");
}

// ---------------------------------------------------------------------------
// El lado del vendedor, en su propia sesion.
//
// Es la mitad del sistema que nunca se habia capturado, y la que mas se usa
// desde el telefono. Necesita una cuenta de vendedor, que no viene en el seed:
// la crea `scripts/sembrar-demo.ts`.
// ---------------------------------------------------------------------------
const contextoVendedor = await navegador.newContext({
  ...(MOVIL
    ? devices["iPhone 14"]
    : { viewport: { width: 1440, height: 950 }, deviceScaleFactor: 2 }),
  locale: "es-AR",
});
const paginaVendedor = await contextoVendedor.newPage();

const csrfVendedor = await (await contextoVendedor.request.get(`${BASE}/api/auth/csrf`)).json();
await contextoVendedor.request.post(`${BASE}/api/auth/callback/credentials`, {
  form: { csrfToken: csrfVendedor.csrfToken, ...VENDEDOR, callbackUrl: `${BASE}/` },
  maxRedirects: 0,
});

const sesionVendedor = await (await contextoVendedor.request.get(`${BASE}/api/auth/session`)).json();

if (!sesionVendedor?.user) {
  console.log(
    `\n(no hay cuenta de vendedor ${VENDEDOR.email}: se saltean sus pantallas.\n` +
      " Se crea con: npx tsx scripts/sembrar-demo.ts)"
  );
} else {
  siguiente = 50;
  for (const [nombre, ruta] of PANTALLAS_VENDEDOR) {
    await capturar(paginaVendedor, nombre, ruta);
  }
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
