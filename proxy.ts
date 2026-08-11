import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { RUTA_INICIO, ZONA_COOKIE } from "@/lib/constantes";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const path = nextUrl.pathname;
  const usuario = req.auth?.user;

  // --- Sin sesion: solo puede ver el login -------------------------------
  if (!usuario) {
    if (path === "/login") return;
    const url = new URL("/login", nextUrl);
    if (path !== "/") url.searchParams.set("volverA", path + nextUrl.search);
    return Response.redirect(url);
  }

  const inicio = RUTA_INICIO[usuario.role];

  if (path === "/login" || path === "/") {
    return Response.redirect(new URL(inicio, nextUrl));
  }

  // --- Separacion por rol -------------------------------------------------
  if (usuario.role === "VENDEDOR" && path.startsWith("/admin")) {
    return Response.redirect(new URL(inicio, nextUrl));
  }
  if (usuario.role === "ADMIN" && path.startsWith("/vendedor")) {
    return Response.redirect(new URL(inicio, nextUrl));
  }

  // --- Zona activa --------------------------------------------------------
  // El admin no puede operar sin haber elegido zona; el vendedor tiene la suya
  // fija y no pasa por el selector.
  if (usuario.role === "ADMIN") {
    const tieneZona = Boolean(req.cookies.get(ZONA_COOKIE)?.value);
    if (!tieneZona && path !== "/seleccionar-zona") {
      return Response.redirect(new URL("/seleccionar-zona", nextUrl));
    }
  } else if (path === "/seleccionar-zona") {
    return Response.redirect(new URL(inicio, nextUrl));
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
