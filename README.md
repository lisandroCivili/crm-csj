# CRM Club San Jorge

Sistema de gestión para Balta y Pedro Toledo, agentes mercantiles de Club San Jorge
S.A. de Capitalización y Ahorro: leads, equipo de venta, padrón de clientes, ventas
y comisiones.

El contexto del negocio y las reglas que no se deducen del código están en
[CLAUDE.md](CLAUDE.md).

## Puesta en marcha

```bash
npm install
cp .env.example .env      # completar AUTH_SECRET (npx auth secret)
npm run dev               # levanta la base local y la web
```

Con la base andando, en otra terminal:

```bash
npm run db:migrate        # crea las tablas
npm run db:seed           # zonas y usuarios admin
```

Después entrar a http://localhost:3000 con el usuario que imprime el seed.

> **`npm run dev` levanta dos procesos**: el Postgres local de Prisma y el
> servidor web. Si se corre solo `next dev`, la web arranca pero todas las
> páginas fallan con `ECONNREFUSED` porque no hay base.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Base local + web en localhost:3000 |
| `npm run build` | Build de producción |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Aplica cambios del schema |
| `npm run db:studio` | Explorador de la base |
| `npm run db:seed` | Carga zonas y admins |
| `npm run capturas` | Capturas de todas las pantallas en `.capturas/` |

## Verificación del padrón

La importación de padrones es la pieza más delicada del sistema. Para
comprobarla contra un archivo real:

```bash
npx tsx scripts/verificar-padron.ts "docs/Padron-xxx.xls" --limpiar
```

Verifica que los totales coincidan con el archivo, que reimportarlo no cambie
nada, y que un padrón del período siguiente continúe la numeración de cuotas sin
duplicar ni saltear.

## Datos sensibles

Los padrones reales traen nombre, DNI, domicilio, teléfono y email de miles de
clientes, y los adjuntos incluyen fotos de DNI. Nada de eso se versiona ni se
sirve por URL pública: los adjuntos salen por `/api/uploads/[id]`, que valida
sesión y permiso en cada descarga.

## Producción

Se despliega en Railway: la aplicación, el Postgres y un volumen persistente
montado en `UPLOADS_DIR` para los adjuntos.
