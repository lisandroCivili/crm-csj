import { NextResponse } from "next/server";
import { leerAdjunto } from "@/lib/archivos";
import { db } from "@/lib/db";
import { getUsuarioActual, getZonaActivaId } from "@/lib/sesion";

/**
 * Entrega los adjuntos de una venta (foto de DNI, contrato).
 *
 * Son datos personales, asi que no viven en /public: cada descarga pasa por
 * aca, que verifica sesion y permiso. Un vendedor solo accede a los adjuntos de
 * sus propias ventas; el admin, a los de la zona que tiene activa.
 *
 * El estado de la cuenta se lee de la base y no del token: si no, alguien dado
 * de baja seguiria bajando fotos de DNI con su sesion vieja.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const usuario = await getUsuarioActual();
  if (!usuario) {
    return new NextResponse("No autorizado", { status: 401 });
  }

  const { id } = await params;

  const adjunto = await db.ventaAdjunto.findUnique({
    where: { id },
    select: {
      path: true,
      mimeType: true,
      tipo: true,
      venta: { select: { vendedorId: true, zonaId: true } },
    },
  });

  if (!adjunto) return new NextResponse("No encontrado", { status: 404 });

  const permitido =
    usuario.role === "ADMIN"
      ? adjunto.venta.zonaId === (await getZonaActivaId())
      : adjunto.venta.vendedorId === usuario.vendedorId;

  // Se responde 404 y no 403 para no confirmar que el adjunto existe.
  if (!permitido) return new NextResponse("No encontrado", { status: 404 });

  let contenido: Buffer;
  try {
    contenido = await leerAdjunto(adjunto.path);
  } catch {
    return new NextResponse("No encontrado", { status: 404 });
  }

  return new NextResponse(new Uint8Array(contenido), {
    headers: {
      "Content-Type": adjunto.mimeType,
      "Content-Disposition": `inline; filename="${adjunto.tipo.toLowerCase()}"`,
      // Privado: que no quede cacheado en proxies compartidos.
      "Cache-Control": "private, max-age=0, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
