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
- **Comisiones**: cada vendedor tiene un tope configurable de cuotas por las que cobra (c1 a c5,
  lo define Balta por vendedor), y el % de cada cuota varía según el volumen de ventas acumulado
  (tabla `EscalaComision`, editable desde la UI — **nunca hardcodear porcentajes**). Balta puede
  sumar además un importe manual de "gastos de representación".
- **La zona filtra todo.** El admin elige Salta o Tucumán después de loguearse y esa elección
  define qué ve y qué carga. Los vendedores tienen zona fija. Toda query debe estar scopeada.

## Decisiones pendientes del cliente

Estas tres respuestas están pendientes y **solo bloquean la Fase 7 (comisiones)**:

1. Si la comisión se liquida desde el **padrón** (dato oficial del club) o desde las **ventas
   cargadas** en el CRM.
2. Sobre qué monto se aplica el % (importe de la cuota pagada, valor nominal del plan, u otro).
3. Cómo se vincula una venta cargada por el vendedor con su `NumTit` cuando aparece en el padrón.

El modelo de datos ya guarda toda la materia prima necesaria, así que cualquiera de las
respuestas se implementa como configuración del motor, no como rediseño.

## Stack

Next.js 16 (App Router) · TypeScript · Prisma 7 + PostgreSQL · Auth.js v5 (Credentials) ·
Tailwind 4 + shadcn/ui · zod + react-hook-form · SheetJS (`xlsx`) · Recharts · **Railway** (app,
Postgres y volumen persistente para adjuntos).

## Comandos

```bash
npm run dev              # desarrollo en localhost:3000
npm run build            # build de produccion
npm run lint             # eslint
npx prisma migrate dev   # aplicar cambios de schema
npx prisma studio        # inspeccionar la base
npm run db:seed          # cargar zonas y usuarios admin
```

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
