# CRM Club San Jorge — Balta

CRM para **Balta** (Baltazar Ignacio Toledo Perez) y **Pedro Toledo**, agentes mercantiles de
Club San Jorge S.A. de Capitalización y Ahorro.

> En este proyecto, "Balta" siempre se refiere al cliente para quien se desarrolla el sistema.

## El negocio

Club San Jorge vende **planes de ahorro con sorteo** (Auto, Moto, Dinero; de 330, 90 o 120 meses).
El cliente paga cuotas mensuales y participa de sorteos; si sale **adjudicado**, recibe el bien
antes de terminar de pagarlo. Balta y Pedro son agentes que comercializan estos planes con un
equipo de vendedores a cargo.

Vocabulario del dominio (aparece tal cual en el padrón y en el código):

| Término | Significado |
|---|---|
| **Título** (`NumTit`) | Identificador único del contrato/suscripción. Un cliente puede tener varios. |
| **Cuota** | Número de cuota del título (va de 1 a ~300). No es un monto, es el ordinal. |
| **Padrón** | Excel que el club envía periódicamente con el estado de todos los títulos. |
| **Emisión** | Mes al que corresponde una fila del padrón. |
| **`NomVen`** | Nombre del vendedor tal como viene escrito en el padrón (texto libre, sucio). |
| **`NumSor`** | Número de sorteo del título (0-999). |
| **Adjudicado** | Suscriptor que ganó el sorteo y recibe el bien. |
| **Zona** | Salta o Tucumán. Separa toda la operación. |

## Reglas de negocio que no se deducen del código

- **El padrón trae 3 meses por título, no una foto del mes actual.** Cada título aparece en 3
  filas con cuotas consecutivas (n, n+1, n+2). Padrones sucesivos **pueden solaparse** según cada
  cuánto los emita el club.
- **Por eso la importación es un upsert idempotente con clave `(tituloId, numeroCuota)`**, nunca
  un append. Reimportar el mismo archivo no debe duplicar ni alterar nada. Esta es la regla más
  importante del sistema; ver `lib/padron/importarPadron.ts`.
- **`FchPago` vacío = cuota impaga.** Una cuota que pasa de vacía a tener fecha es una cuota
  recién cobrada, y es la materia prima del cálculo de comisiones.
- **`NomVen` es texto libre e inconsistente**: el mismo vendedor aparece escrito de varias formas
  (ej. `TOLEDO PEDRO`, `TOLEDO PEDRO A.`, `TOLEDO PEDRO ANTONIO` son la misma persona). Se
  normaliza con la tabla `VendedorAlias`; nunca agrupar vendedores por el string del padrón.
- **Un `Vendedor` puede existir sin cuenta de usuario**: hay vendedores que figuran en el padrón
  pero no usan el sistema. La cuenta (`User`) es opcional.
- **La zona filtra todo.** El admin elige Salta o Tucumán después de loguearse y esa elección
  define qué ve y qué carga. Los vendedores tienen zona fija. Toda query debe estar scopeada.

## Cómo se liquida la comisión

Confirmado por Balta el 2026-08-12. El motor vive en
`lib/comisiones/calcularComisionPeriodo.ts`, que es una **función pura** con tests: es el único
lugar donde un bug se traduce en plata mal pagada.

- **Sale del padrón, no de las ventas del CRM.** `Venta` no interviene en el cálculo: existe
  para que el vendedor registre su pipeline. La materia prima es `TituloCuota`.
- **Una cuota se devenga en el mes en que `detectadaPagaAt` cae**, o sea cuando el sistema la vio
  cobrada por primera vez al importar un padrón — no en el mes de `fechaPago`. El padrón llega
  desfasado: se vende en agosto, el sorteo es en septiembre y el padrón de ese ciclo llega
  alrededor del 10 de septiembre.
- **El porcentaje se aplica sobre el importe cobrado**, no sobre el valor nominal del plan, y las
  cuotas se agrupan **por número de cuota**: cada número tiene su propio %, y la cuota 1 suele ser
  la más alta.
- **El tramo de `EscalaComision` se mide por mes, no por acumulado**: lo define la cantidad de
  ventas nuevas (cuotas 1 cobradas) de ese mes. Puede ser 0, y en ese caso el vendedor igual cobra
  sus cuotas 2, 3… al tramo más bajo (por eso siempre tiene que existir un tramo con
  `ventasMin = 0`).
- Cada vendedor cobra hasta cierto número de cuota (`topeCuotasComision`, c1 a c5); lo que pasa de
  ahí se descarta. Balta puede sumar un importe manual de "gastos de representación".
- Los porcentajes salen siempre de `EscalaComision`, editable en `/admin/comisiones/escalas`.
  **Nunca hardcodearlos.**
- **Cerrar el período congela los porcentajes** en `ComisionDetalle`. Un período cerrado no se
  recalcula aunque después cambie la escala o entre otro padrón; se puede reabrir a mano.

## Stack

Next.js 16 (App Router) · TypeScript · Prisma 7 + PostgreSQL · Auth.js v5 (Credentials) ·
Tailwind 4 + shadcn/ui · zod + react-hook-form · SheetJS (`xlsx`) · Recharts · **Railway** (app,
Postgres y volumen persistente para adjuntos).

## Comandos

```bash
npm run dev              # levanta la base local Y la web (localhost:3000)
npm run build            # build de produccion
npm run lint             # eslint
npm test                 # vitest (motor de comisiones y helpers de lib/)
npm run db:migrate       # aplicar cambios de schema
npm run db:studio        # inspeccionar la base
npm run db:seed          # cargar zonas y usuarios admin
npm run capturas         # capturas de pantalla de todas las vistas
```

### Desarrollo local necesita dos procesos

En desarrollo la base es el Postgres que trae Prisma (`prisma dev`), que **no
es un servicio del sistema**: es un proceso que vive mientras esté abierto. Por
eso `npm run dev` levanta los dos con `concurrently`.

Si se corre solo `next dev`, la web arranca igual y parece que anda, pero todas
las páginas tiran `ECONNREFUSED` de Prisma al consultar. El síntoma es
engañoso: el problema no es la web, es que falta la base.

El servidor se levanta con `--name crm-csj`, lo que le fija el puerto (51218) y
conserva los datos entre reinicios, así el `DATABASE_URL` del `.env` no queda
viejo. Si alguna vez cambia, hay que actualizar `.env`.

La primera vez el arranque de la base tarda porque descarga el binario
("Fetching latest updates…"). Después es inmediato.

## Datos sensibles

Los padrones reales contienen nombre, DNI, domicilio, teléfono y email de miles de clientes
reales, y los adjuntos incluyen **fotos de DNI**. Nada de eso se versiona (ver `.gitignore`) ni
se expone por URL pública: los adjuntos se sirven por `/api/uploads/[id]`, que valida sesión y
permiso antes de entregar el archivo.

## Estructura

```
app/            rutas (App Router): /login, /admin/*, /vendedor/*, /api/*
lib/            db, auth, zona (scope activo), excel/, padron/, comisiones/, validations/
components/     ui/ (shadcn) + componentes por modulo
prisma/         schema.prisma, migrations/, seed.ts
docs/           material de referencia del cliente (no versionado si trae datos reales)
.claude/        skills/ y rules/ del proyecto
```

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
