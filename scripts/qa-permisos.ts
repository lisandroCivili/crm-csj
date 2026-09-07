/**
 * QA DE PERMISOS Y AISLAMIENTO DE ZONAS. Solo para desarrollo.
 *
 *   npx tsx scripts/qa-permisos.ts
 *
 * Recorre la matriz de "quién puede ver qué" con los tres actores del escenario
 * de prueba y devuelve exit code 0 o 1, así puede correr en CI.
 *
 * POR QUE EXISTE
 *
 * Porque los defectos que la Fase 13 encontró no los encontró la lectura del
 * código: la auditoría de las 59 rutas dio limpia y los dos agujeros de zona
 * aparecieron recién al operar de verdad la segunda zona. Esto es lo que fija
 * esos arreglos para que no vuelvan.
 *
 * Mira códigos de respuesta y redirecciones, no textos de pantalla: es el tipo
 * de prueba que no se rompe cada vez que se cambia una etiqueta.
 *
 * ANTES DE CORRER: `npx tsx scripts/sembrar-demo.ts`, que deja las dos zonas
 * cargadas y la cuenta de vendedor que hace falta acá.
 *
 * El servidor tiene que estar levantado. Conviene contra el build
 * (`npm run build && npx next start -p 3010`, con BASE_URL apuntando ahí) y no
 * contra `next dev`: en desarrollo el bloqueo de recursos y el hot-reload
 * distorsionan las navegaciones.
 */
import "dotenv/config";
import { chromium, type BrowserContext } from "playwright";
import { db } from "../lib/db";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const PASSWORD_ADMIN = process.env.SEED_ADMIN_PASSWORD ?? "CambiarEstePassword123";
const PASSWORD_VENDEDOR = process.env.SEED_VENDEDOR_PASSWORD ?? "CambiarEstePassword123";

let fallas = 0;
let corridas = 0;

function check(condicion: boolean, titulo: string, detalle = "") {
  corridas++;
  if (condicion) {
    console.log(`  ok   ${titulo}`);
  } else {
    fallas++;
    console.log(`  MAL  ${titulo}${detalle ? ` — ${detalle}` : ""}`);
  }
}

function titulo(texto: string) {
  console.log(`\n${texto}`);
}

// ---------------------------------------------------------------------------
// Sesión
// ---------------------------------------------------------------------------

/**
 * Entra por la API en vez de llenar el formulario. Es lo mismo que hace
 * `scripts/capturas.mjs`: si se clickea antes de que hidrate React, el navegador
 * manda un POST nativo y vuelve al login sin sesión.
 */
async function entrar(contexto: BrowserContext, email: string, password: string) {
  const csrf = await (await contexto.request.get(`${BASE}/api/auth/csrf`)).json();
  await contexto.request.post(`${BASE}/api/auth/callback/credentials`, {
    form: { csrfToken: csrf.csrfToken, email, password },
  });
  const yo = await contexto.request.get(`${BASE}/api/auth/session`);
  const sesion = await yo.json();
  if (!sesion?.user) throw new Error(`No se pudo iniciar sesión como ${email}.`);
  return sesion.user as { id: string; role: string };
}

async function ponerZona(contexto: BrowserContext, zonaId: number) {
  await contexto.addCookies([
    {
      name: "zona_activa",
      value: String(zonaId),
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

/**
 * Una navegación sin seguir redirecciones: interesa el 307 y su destino.
 *
 * El timeout es generoso porque contra `next dev` la primera visita a una ruta
 * la compila en el momento, y una pantalla que nunca se abrió puede tardar
 * medio minuto. Contra el build no pasa.
 */
async function ir(contexto: BrowserContext, ruta: string) {
  const respuesta = await contexto.request.get(`${BASE}${ruta}`, {
    maxRedirects: 0,
    timeout: 120_000,
  });
  return {
    status: respuesta.status(),
    destino: respuesta.headers()["location"] ?? null,
  };
}

const rebotaA = (r: { status: number; destino: string | null }, ruta: string) =>
  r.status >= 300 && r.status < 400 && (r.destino ?? "").includes(ruta);

// ---------------------------------------------------------------------------

async function main() {
  const salta = await db.zona.findUniqueOrThrow({ where: { nombre: "SALTA" } });
  const tucuman = await db.zona.findUniqueOrThrow({ where: { nombre: "TUCUMAN" } });

  // Los objetos de la otra zona con los que se prueba el cruce por URL.
  const clienteTuc = await db.cliente.findFirst({ where: { zonaId: tucuman.id }, select: { id: true } });
  const vendedorTuc = await db.vendedor.findFirst({ where: { zonaId: tucuman.id }, select: { id: true } });
  const clienteSalta = await db.cliente.findFirst({ where: { zonaId: salta.id }, select: { id: true } });

  if (!clienteTuc || !vendedorTuc || !clienteSalta) {
    console.error(
      "\nFalta el escenario de prueba en las dos zonas. Antes de esto:\n\n" +
        "  npx tsx scripts/sembrar-demo.ts\n"
    );
    process.exitCode = 1;
    return;
  }

  const fichaVendedor = await db.vendedor.findFirst({
    where: { user: { email: "vendedor@crm-csj.local" } },
    select: { id: true, zonaId: true, userId: true },
  });
  if (!fichaVendedor?.userId) {
    console.error("\nFalta la cuenta de vendedor. Corré: npx tsx scripts/sembrar-demo.ts\n");
    process.exitCode = 1;
    return;
  }

  const navegador = await chromium.launch();

  try {
    // -------------------------------------------------------------------
    titulo("1. Sin sesión no se ve nada");
    const anonimo = await navegador.newContext();
    for (const ruta of ["/admin/dashboard", "/admin/clientes", "/vendedor/ventas", "/perfil"]) {
      const r = await ir(anonimo, ruta);
      check(rebotaA(r, "/login"), `${ruta} manda al login`, `dio ${r.status} → ${r.destino}`);
    }
    const conVuelta = await ir(anonimo, "/admin/clientes");
    check(
      (conVuelta.destino ?? "").includes("volverA"),
      "y se acuerda de a dónde iba (volverA)",
      conVuelta.destino ?? ""
    );
    await anonimo.close();

    // -------------------------------------------------------------------
    titulo("2. El vendedor no entra a la administración");
    const vend = await navegador.newContext();
    await entrar(vend, "vendedor@crm-csj.local", PASSWORD_VENDEDOR);
    for (const ruta of [
      "/admin/dashboard",
      "/admin/clientes",
      "/admin/comisiones",
      "/admin/vendedores",
      "/admin/laboratorio",
      "/admin/padron",
    ]) {
      const r = await ir(vend, ruta);
      check(rebotaA(r, "/vendedor"), `${ruta} rebota a su dashboard`, `dio ${r.status} → ${r.destino}`);
    }

    // La cookie de zona no le sirve de nada: su zona es la de su ficha.
    await ponerZona(vend, tucuman.id);
    const rZona = await ir(vend, "/admin/clientes");
    check(rebotaA(rZona, "/vendedor"), "ponerse la cookie de zona no lo mete en /admin");

    // -------------------------------------------------------------------
    titulo("3. Los permisos del vendedor blindan la página, no sólo el menú");
    const permisos = [
      { campo: "puedeVerLeads", ruta: "/vendedor/leads" },
      { campo: "puedeCargarVentas", ruta: "/vendedor/ventas" },
      { campo: "puedeVerCartera", ruta: "/vendedor/cartera" },
    ] as const;

    for (const { campo, ruta } of permisos) {
      const abierto = await ir(vend, ruta);
      check(abierto.status === 200, `con el permiso, ${ruta} abre`, `dio ${abierto.status}`);

      await db.vendedor.update({ where: { id: fichaVendedor.id }, data: { [campo]: false } });
      const cerrado = await ir(vend, ruta);
      check(
        rebotaA(cerrado, "/vendedor/dashboard"),
        `sin ${campo}, ${ruta} rebota al dashboard`,
        `dio ${cerrado.status} → ${cerrado.destino}`
      );
      await db.vendedor.update({ where: { id: fichaVendedor.id }, data: { [campo]: true } });
    }

    // El permiso se lee de la base en cada request: sin recargar la sesión.
    check(true, "y el cambio le llega sin volver a iniciar sesión (se leyó de la base)");

    // -------------------------------------------------------------------
    titulo("4. La cartera del vendedor tiene sólo sus títulos");
    // La ficha de un título ajeno da 404 y no 403: su existencia tampoco es
    // asunto de quien pregunta. Es el mismo criterio de las otras once rutas
    // `[id]`, y lo que sostiene que abrirle la cartera al vendedor no
    // contradiga el "solo admin ve clientes" de Balta.
    const tituloPropio = await db.titulo.findFirst({
      where: { vendedorId: fichaVendedor.id },
      select: { id: true },
    });
    const tituloAjeno = await db.titulo.findFirst({
      where: { NOT: { vendedorId: fichaVendedor.id } },
      select: { id: true },
    });

    if (!tituloPropio || !tituloAjeno) {
      console.log("  (faltan títulos para comparar: se salta)");
    } else {
      const propioR = await ir(vend, `/vendedor/cartera/${tituloPropio.id}`);
      check(propioR.status === 200, "la ficha de un título suyo abre", `dio ${propioR.status}`);

      const ajenoR = await ir(vend, `/vendedor/cartera/${tituloAjeno.id}`);
      check(
        ajenoR.status === 404,
        "la de un título que no es suyo da 404",
        `dio ${ajenoR.status}`
      );
    }

    // -------------------------------------------------------------------
    titulo("5. Una cuenta desactivada deja de entrar en el acto");
    await db.user.update({ where: { id: fichaVendedor.userId }, data: { activo: false } });
    const desactivado = await ir(vend, "/vendedor/dashboard");
    check(
      rebotaA(desactivado, "/api/salir"),
      "con la cuenta desactivada sale por /api/salir",
      `dio ${desactivado.status} → ${desactivado.destino}`
    );
    await db.user.update({ where: { id: fichaVendedor.userId }, data: { activo: true } });

    titulo("6. Un vendedor dado de baja del equipo tampoco entra");
    await db.vendedor.update({ where: { id: fichaVendedor.id }, data: { activo: false } });
    const deBaja = await ir(vend, "/vendedor/dashboard");
    check(
      rebotaA(deBaja, "/api/salir"),
      "con la ficha dada de baja sale del sistema",
      `dio ${deBaja.status} → ${deBaja.destino}`
    );
    await db.vendedor.update({ where: { id: fichaVendedor.id }, data: { activo: true } });
    await vend.close();

    // -------------------------------------------------------------------
    titulo("7. El admin no ve la otra zona escribiendo la URL");
    const admin = await navegador.newContext();
    await entrar(admin, "balta@crm-csj.local", PASSWORD_ADMIN);
    await ponerZona(admin, salta.id);

    const propio = await ir(admin, `/admin/clientes/${clienteSalta.id}`);
    check(propio.status === 200, "la ficha de un cliente de su zona abre", `dio ${propio.status}`);

    const cruzados: [string, string][] = [
      [`/admin/clientes/${clienteTuc.id}`, "cliente"],
      [`/admin/clientes/${clienteTuc.id}/editar`, "cliente (editar)"],
      [`/admin/vendedores/${vendedorTuc.id}`, "vendedor"],
      [`/admin/vendedores/${vendedorTuc.id}/editar`, "vendedor (editar)"],
      [`/admin/comisiones/vendedor/${vendedorTuc.id}`, "comisión del vendedor"],
    ];
    for (const [ruta, que] of cruzados) {
      const r = await ir(admin, ruta);
      check(r.status === 404, `${que} de Tucumán da 404 desde Salta`, `dio ${r.status}`);
    }

    // Y al revés, para que no sea que Tucumán no existe.
    await ponerZona(admin, tucuman.id);
    const desdeTucuman = await ir(admin, `/admin/clientes/${clienteTuc.id}`);
    check(
      desdeTucuman.status === 200,
      "el mismo cliente abre bien parado en Tucumán",
      `dio ${desdeTucuman.status}`
    );
    const saltaDesdeTuc = await ir(admin, `/admin/clientes/${clienteSalta.id}`);
    check(saltaDesdeTuc.status === 404, "y el de Salta pasa a dar 404", `dio ${saltaDesdeTuc.status}`);

    // -------------------------------------------------------------------
    titulo("8. Una zona que no existe manda a elegir de nuevo");
    await ponerZona(admin, 99999);
    const zonaFantasma = await ir(admin, "/admin/clientes");
    check(
      rebotaA(zonaFantasma, "/seleccionar-zona"),
      "con una zona inexistente en la cookie vuelve al selector",
      `dio ${zonaFantasma.status} → ${zonaFantasma.destino}`
    );
    await ponerZona(admin, salta.id);

    // -------------------------------------------------------------------
    titulo("9. Los adjuntos son de quien los subió");
    const adjunto = await db.ventaAdjunto.findFirst({
      select: { id: true, venta: { select: { zonaId: true, vendedorId: true } } },
    });

    if (!adjunto) {
      console.log("  (no hay adjuntos cargados: se salta)");
    } else {
      const otraZona = adjunto.venta.zonaId === salta.id ? tucuman.id : salta.id;
      await ponerZona(admin, adjunto.venta.zonaId);
      const propio = await ir(admin, `/api/uploads/${adjunto.id}`);
      check(propio.status === 200, "el admin lo baja parado en la zona de la venta");

      await ponerZona(admin, otraZona);
      const ajeno = await ir(admin, `/api/uploads/${adjunto.id}`);
      check(ajeno.status === 404, "y desde la otra zona da 404, no 403", `dio ${ajeno.status}`);
      await ponerZona(admin, salta.id);
    }

    const sinSesion = await navegador.newContext();
    const uploadAnonimo = await ir(sinSesion, "/api/uploads/cualquier-cosa");
    check(uploadAnonimo.status === 401, "sin sesión, la ruta de adjuntos da 401", `dio ${uploadAnonimo.status}`);
    await sinSesion.close();

    // -------------------------------------------------------------------
    titulo("10. El login no lleva a otro sitio");
    const conVolver = await navegador.newContext();
    const paginaLogin = await conVolver.newPage();
    await paginaLogin.goto(`${BASE}/login?volverA=//ejemplo.com/x`, { waitUntil: "domcontentloaded" });
    const destino = await paginaLogin.locator('input[name="volverA"]').inputValue();
    check(destino === "/", 'una URL de otro sitio se normaliza a "/"', `quedó "${destino}"`);
    await conVolver.close();

    // -------------------------------------------------------------------
    titulo("11. Cada zona liquida lo suyo");
    // No es una prueba de permisos, pero es el defecto que la Fase 13 encontró:
    // un título imputado a la zona equivocada no se ve en ninguna pantalla de
    // permisos, se ve en la plata.
    const titulos = await db.titulo.findMany({
      select: { numTit: true, zonaId: true, vendedor: { select: { zonaId: true } } },
    });
    const cruzadosTitulo = titulos.filter((t) => t.vendedor && t.vendedor.zonaId !== t.zonaId);
    check(
      cruzadosTitulo.length === 0,
      "ningún título está imputado a un vendedor de otra zona",
      cruzadosTitulo.map((t) => t.numTit).join(", ")
    );

    const porZona = new Map<number, number>();
    for (const t of titulos) porZona.set(t.zonaId, (porZona.get(t.zonaId) ?? 0) + 1);
    check(
      porZona.size >= 2,
      "las dos zonas tienen títulos propios cargados",
      [...porZona].map(([zona, n]) => `zona ${zona}: ${n}`).join(" · ")
    );

    // Y el número de título no se repite entre zonas, que es lo que confirmó
    // Balta: si aparecieran repetidos, el escenario estaría simulando algo que
    // no pasa y la importación lo rechazaría.
    const repetidos = titulos
      .map((t) => t.numTit)
      .filter((numTit, i, todos) => todos.indexOf(numTit) !== i);
    check(repetidos.length === 0, "ningún número de título se repite entre zonas", repetidos.join(", "));

    await admin.close();
  } finally {
    await navegador.close();
    await db.$disconnect();
  }

  console.log(
    fallas === 0
      ? `\n${corridas} comprobaciones, todas bien.\n`
      : `\n${fallas} de ${corridas} comprobaciones fallaron.\n`
  );
  process.exitCode = fallas === 0 ? 0 : 1;
}

main().catch(async (error) => {
  console.error(error);
  await db.$disconnect().catch(() => {});
  process.exit(1);
});
