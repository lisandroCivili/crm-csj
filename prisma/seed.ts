import "dotenv/config";
import bcrypt from "bcryptjs";
import { db } from "../lib/db";

// Password inicial de los admins. Se puede pisar con SEED_ADMIN_PASSWORD.
const PASSWORD_INICIAL = process.env.SEED_ADMIN_PASSWORD ?? "CambiarEstePassword123";

async function main() {
  // --- Zonas -------------------------------------------------------------
  const zonas = await Promise.all(
    (["SALTA", "TUCUMAN"] as const).map((nombre) =>
      db.zona.upsert({
        where: { nombre },
        update: {},
        create: { nombre },
      })
    )
  );
  console.log(`Zonas: ${zonas.map((z) => z.nombre).join(", ")}`);

  // --- Admins ------------------------------------------------------------
  // Los dos tienen todos los permisos.
  // TODO: falta el nombre completo de Pedro Toledo (pendiente del cliente).
  const admins = [
    { email: "balta@crm-csj.local", nombre: "Baltazar Ignacio Toledo Perez" },
    { email: "pedro@crm-csj.local", nombre: "Pedro Toledo" },
  ];

  const passwordHash = await bcrypt.hash(PASSWORD_INICIAL, 10);

  for (const admin of admins) {
    // No pisamos el password si el usuario ya existe: seedear de nuevo no
    // debe revertir un cambio de contrasena hecho desde la aplicacion.
    const user = await db.user.upsert({
      where: { email: admin.email },
      update: { nombre: admin.nombre, role: "ADMIN", activo: true },
      create: { ...admin, role: "ADMIN", passwordHash },
    });
    console.log(`Admin: ${user.email}`);
  }

  console.log(
    `\nPassword inicial de los admins: ${PASSWORD_INICIAL}\n` +
      "Cambiarla despues del primer ingreso."
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
