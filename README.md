# CRM Club San Jorge

Sistema de gestión hecho a medida para agentes mercantiles de
Club San Jorge S.A. de Capitalización y Ahorro: administran su equipo de vendedores, el
padrón de clientes, las ventas y la liquidación de comisiones de dos zonas (Salta y
Tucumán) desde una sola aplicación.

Proyecto real, en producción, desarrollado en solitario de punta a punta: relevamiento
del negocio con el cliente, modelado de datos, desarrollo y despliegue.

## El problema que resuelve

Club San Jorge vende planes de ahorro con sorteo: el cliente paga cuotas mensuales y, si
sale sorteado, recibe el bien antes de terminar de pagarlo. El club le manda a la agencia
un Excel periódico ("padrón") con el estado de todos los títulos activos, y a partir de
ahí los agentes tienen que saber quién cobró, a quién hay que llamar porque dejó de
pagar, cuánto le corresponde a cada vendedor de su equipo y cuánto le paga el club a la
agencia. Antes de este sistema, eso se resolvía a mano sobre el Excel.

El CRM automatiza esa cadena completa: importa el padrón, calcula comisiones con la
escala vigente, detecta títulos caídos y le da a cada vendedor su propio panel con
permisos por sección.

## Lo técnicamente interesante

- **Importación idempotente de un Excel que no es una foto del estado actual.** Cada
  padrón trae 3 meses por título y padrones sucesivos se solapan; la importación hace
  upsert por `(título, número de cuota)`, nunca un append, así que reimportar el mismo
  archivo no duplica ni altera nada.
- **Motor de comisiones como función pura, con tests.** El cálculo de lo que cobra cada
  vendedor y lo que el club le paga a la agencia vive fuera de la capa de base de datos y
  de UI, en funciones puras testeadas con Vitest — es el único lugar donde un bug se
  traduce directamente en plata mal pagada.
- **Detección de títulos caídos con manejo explícito de "no sé".** Un título cae con 6
  cuotas consecutivas impagas contando desde la más reciente hacia atrás; si falta un
  número de cuota en el medio del historial, el sistema no adivina — marca el dato como
  no confiable en vez de mostrar un falso "al día".
- **Sesión con autorización resuelta en cada request, nunca en el token.** El JWT sólo
  identifica quién es; rol, permisos y estado de la cuenta se leen de la base en cada
  pedido, para que sacarle un permiso a alguien surta efecto en el acto y no semanas
  después.
- **Normalización de texto libre y sucio.** El vendedor de un título viene escrito en el
  padrón de forma inconsistente (`PEREZ JUAN`, `PEREZ JUAN A.`, `PEREZ JUAN
  ANTONIO`); una tabla de alias los agrupa en la persona real en vez de contar por string.
- **Gráficos accesibles sin librería de charts.** Los del dashboard son SVG renderizados
  en el servidor con una paleta de colores validada contra daltonismo (nunca rojo y verde
  juntos como par de serie), en vez de sumar una dependencia de cliente para algo que no
  la necesita.
- **Responsive real, no solo CSS.** Por debajo de 768px el layout cambia a tarjetas en
  vez de tablas, porque en el celular el vendedor necesita tres datos y un botón grande,
  no nueve columnas.

## Funcionalidad

- **Padrón**: importación del Excel del club, panel de estado por título y cuota,
  verificación de integridad contra el archivo original.
- **Comisiones**: escalas configurables por vendedor y por agencia, cálculo por período,
  cierre que congela los porcentajes aplicados, gastos de representación.
- **Clientes y caídas**: listado de títulos con estado de pago y de caída (parcial o
  total), filtrable por zona.
- **Vendedores**: alta y ficha por zona, alias de nombre, permisos individuales
  (leads, ventas, comisión) que controlan tanto el menú como cada acción del servidor.
- **Ventas**: carga de venta con foto de DNI opcional, validaciones condicionales
  (número de suscripción vs. título) reforzadas en el servidor.
- **Dashboard**: dos zonas (Salta y Tucumán) con métricas y gráficos propios por rol de
  admin o vendedor.

## Stack

**Next.js 16** (App Router) · **TypeScript** · **Prisma 7** + PostgreSQL · **Auth.js v5**
(Credentials) · **Tailwind 4** + shadcn/ui · **zod** + react-hook-form · SheetJS (`xlsx`)
para el parseo del padrón · **Vitest** para el motor de comisiones y caídas · desplegado
en **Railway** (app, Postgres y volumen persistente para adjuntos).

## Puesta en marcha local

```bash
npm install
cp .env.example .env      # completar AUTH_SECRET (npx auth secret)
npm run dev                # levanta la base local y la web (localhost:3000)
```

Con la base andando, en otra terminal:

```bash
npm run db:migrate        # crea las tablas
npm run db:seed           # zonas y usuarios admin de prueba
```

`npm run dev` levanta dos procesos con `concurrently`: el Postgres local que trae Prisma
(`prisma dev`) y el servidor de Next.js. Si se corre solo `next dev`, la web arranca pero
todas las páginas fallan con `ECONNREFUSED` porque no hay base.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Base local + web en localhost:3000 |
| `npm run build` | Build de producción |
| `npm run lint` | ESLint |
| `npm test` | Tests de `lib/` con Vitest (motor de comisiones, caídas, validaciones) |
| `npm run db:migrate` | Aplica cambios del schema |
| `npm run db:studio` | Explorador de la base |
| `npm run db:seed` | Carga zonas y admins de prueba |
| `npm run capturas` | Capturas de todas las pantallas |

## Datos sensibles

Los padrones reales del club traen nombre, DNI, domicilio, teléfono y email de miles de
clientes, y el sistema guarda fotos de DNI como adjunto. Nada de eso se versiona ni se sirve por URL pública: los adjuntos salen por una ruta que valida
sesión y permiso en cada descarga, y los Excel de padrón real nunca se suben al
repositorio.
