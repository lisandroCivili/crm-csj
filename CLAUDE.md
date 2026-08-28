# CRM Club San Jorge — Balta

CRM para **Balta** (Baltazar Ignacio Toledo Perez) y **Pedro Toledo**, agentes mercantiles de
Club San Jorge S.A. de Capitalización y Ahorro.

> En este proyecto, "Balta" siempre se refiere al cliente para quien se desarrolla el sistema.

> **Hay trabajo en curso.** El plan de cambios activo, con sus fases, su avance y cómo se
> trabaja en él, está en [`docs/PLAN.md`](docs/PLAN.md). Leerlo antes de empezar: define que
> se avanza de a una fase, que al terminar cada una hay que entregar los pasos exactos para
> probarla en el navegador, y que la fase se marca como hecha recién cuando Lisandro la valida.

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
- **Una renovación es un título que no estaba en el padrón anterior y aparece con cuota > 1.**
  Si aparece con cuota 1, es una venta nueva. La única forma de saberlo es comparando contra lo
  que ya había, así que el origen se decide en la importación y se **sella** en `Titulo.origen`;
  no se recalcula nunca (ver `lib/padron/origenTitulo.ts`). La primera importación de una zona no
  tiene con qué comparar: todo entra como `BASE`. Para la comisión no hace falta ningún caso
  especial —la renovación no trae cuota 1, así que no suma al tramo, y sus cuotas cobran el % de
  la cuota real—; el dato sirve para medir la producción del mes sin inflarla.
- **`NomVen` es texto libre e inconsistente**: el mismo vendedor aparece escrito de varias formas
  (ej. `TOLEDO PEDRO`, `TOLEDO PEDRO A.`, `TOLEDO PEDRO ANTONIO` son la misma persona). Se
  normaliza con la tabla `VendedorAlias`; nunca agrupar vendedores por el string del padrón.
- **Un `Vendedor` puede existir sin cuenta de usuario**: hay vendedores que figuran en el padrón
  pero no usan el sistema. La cuenta (`User`) es opcional.
- **Balta y Pedro también venden.** Además de administrar tienen títulos propios en el padrón, y
  venden en las dos zonas. Por eso la ficha de `Vendedor` es **por zona** (el DNI es único dentro
  de la zona, no en toda la tabla) y una cuenta puede estar enlazada a varias fichas, una por zona.
  La ficha del agente se engancha a su cuenta de admin desde `/admin/vendedores/[id]`; no se les
  crea una cuenta de vendedor aparte. Cuál aplica en cada momento lo resuelve
  `getVendedorDelAdmin()` según la zona activa. Ojo: lo que cobran así es su comisión **como
  vendedores**; lo que el club les paga **como agentes** —sobre toda la producción, con la escala
  del contrato de agencia— es otro número, y se calcula aparte (ver
  [Comisión del agente](#comisión-del-agente)).
- **El Excel de precios es de precios, no de catálogo.** La importación crea el plan que no
  existe, pero **no pisa** el `nombre` ni el `activo` de los que ya están: eso lo edita Balta
  desde `/admin/planes/[id]/editar` y tiene que sobrevivir a la lista siguiente. Lo único que
  cada archivo agrega es una fila de `PlanPrecio` con su vigencia. Dar de baja un plan es
  `activo: false`, no borrarlo: `Venta.planId` es una FK sin cascade y las ventas viejas lo
  siguen apuntando.
- **La zona filtra todo.** El admin elige Salta o Tucumán después de loguearse y esa elección
  define qué ve y qué carga. Los vendedores tienen zona fija. Toda query debe estar scopeada.

## Sesión y permisos

- **El JWT es un documento de identidad, no de autorización.** Lo único que se le cree es de
  quién es la sesión; el rol, el nombre, el email, el estado de la cuenta y los permisos se leen
  de la base en cada request (`getUsuarioActual()` en `lib/sesion.ts`, memoizado con `cache()`).
  La razón: los claims del JWT se escriben una sola vez al iniciar sesión, así que si Balta le
  saca un permiso a un vendedor o lo da de baja, el token de esa persona no se entera y seguiría
  entrando por semanas. **Nunca cachear `getUsuarioActual` entre requests.**
- El middleware (`proxy.ts`) sí decide con los claims del token, porque corre en edge y no puede
  consultar Prisma. Alcanza para rutear entre `/admin` y `/vendedor`; el corte fino lo hace el
  servidor.
- **Sacar a alguien nunca se hace con `redirect("/login")`**: el middleware ve la cookie todavía
  válida y lo devuelve, en un ida y vuelta infinito. Para eso está `/api/salir`, que cierra la
  sesión de verdad y avisa el motivo en el login.
- Un vendedor tiene tres permisos (`puedeVerLeads`, `puedeCargarVentas`, `puedeVerComision`),
  todos en `true` por defecto. Se **sacan**, no se dan. Filtran el menú (`itemsVisibles`) y
  además blindan cada página y acción con `requirePermiso`: esconder el ítem no es seguridad.
  Sin permiso se vuelve al dashboard en silencio, igual que cuando un vendedor entra a `/admin`.
- `User.activo` (puede entrar al sistema) es distinto de `Vendedor.activo` (sigue en el equipo).
  El admin maneja los dos por separado desde la ficha del vendedor.

## Mobile

El sistema se usa mucho desde el celular. La barra lateral está oculta por debajo de 768px y la
reemplaza el menú del header (`components/layout/menu-movil.tsx`). Los listados muestran tarjetas
(`components/layout/lista-tarjetas.tsx`) en lugar de la tabla: es markup duplicado a propósito,
porque en el escritorio Balta compara nueve columnas de un vistazo y en el teléfono el vendedor
necesita tres datos y un botón grande. Se verifica con `CAPTURA_MOVIL=1 npm run capturas`.

- **Probar desde el teléfono necesita `allowedDevOrigins`.** `next dev` responde **403** a los
  `/_next/static/chunks/*.js` que pide cualquier host que no sea localhost, así que por un túnel
  la página se dibuja y los links navegan —eso lo hace el servidor— pero **React no hidrata** y
  todo lo que necesita JavaScript queda muerto, sin un solo error en pantalla. Los dominios de
  ngrok están en `next.config.ts`; cualquier otro host va en `ORIGENES_DEV`. El dato para
  diagnosticarlo está en la terminal del server: `Blocked cross-origin request`.
- **`serverActions.allowedOrigins` va sólo en desarrollo.** Existe por si el túnel reescribe el
  `Host` y las server actions dejan de validar el `Origin`. En producción no hay túnel y esa
  lista relaja la protección CSRF.
- **Nunca envolver un `next/link` en el `Close` de un primitivo de Radix.** `Link` llama a
  `preventDefault()` y Radix compone sus handlers con `checkForDefaultPrevented`, así que
  descarta el cierre: se navega con el panel tapando la pantalla. El menú del celular maneja su
  propio estado y cierra en el click, no al cambiar de ruta, para cubrir el caso de tocar el link
  de la pantalla en la que ya se está.
- **`overflow-x: clip` en html/body, nunca `hidden`.** `hidden` crea un contenedor de scroll y
  rompe el `position: sticky` del header. Es una red de contención, no un arreglo: lo que se sale
  se arregla donde se sale, y por eso el chequeo de `scripts/capturas.mjs` **apaga la red antes
  de medir** y nombra al elemento culpable.

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

## Comisión del agente

Lo que **el club le paga a la agencia**, distinto de lo que la agencia le paga a sus vendedores.
Confirmado por Balta el 2026-08-27. Motor en `lib/comisiones/calcularComisionAgente.ts`, también
función pura y testeada.

Misma materia prima que la del vendedor (las cuotas que el padrón mostró cobradas) y mismo
devengamiento (`detectadaPagaAt`), pero otras reglas:

- **Se calcula por zona, no por agente.** Balta quiere el número de Salta y el de Tucumán; no se
  reparte la producción entre él y Pedro. Por eso `ComisionAgentePeriodo` tiene `zonaId`.
- **Entran todas las cuotas de la zona**, sin filtrar por vendedor: también las de títulos cuyo
  `NomVen` no se pudo mapear. Al agente le pagan por lo que cobra la agencia entera.
- **No hay tope de cuota 5.** Ese tope es del vendedor. `CUOTAS_COMISIONABLES` no se usa acá: en
  el padrón real la mayor parte del volumen son cuotas altas que el vendedor ya no cobra, y son
  el grueso del margen de la agencia.
- **Un solo eje: el número de cuota.** El volumen del mes no mueve el porcentaje. Los tramos
  salen de `EscalaAgente` (editable en `/admin/comisiones/agente/escala`); la migración
  `20260827015729_comision_agente` siembra el contrato vigente (25/20/10/4/2) como punto de
  partida. **Nunca hardcodearlos** en el cálculo.
- **El objetivo de contratos es por zona** (`Zona.objetivoContratosMensual`: Salta 100, Tucumán
  50) y cuenta **ventas nuevas + renovaciones** — al revés que el tramo del vendedor, donde la
  renovación no suma. Se mide por `Titulo.createdAt` con `origen != BASE`. Si no se llega, se
  avisa pero se liquida igual: falta saber a qué esquema vuelve el club.
- **Los gastos de representación no son comisión**: se cargan a mano, se muestran aparte y no
  entran en el total ni en el margen. El club los ajusta por inflación.
- Cerrar congela los porcentajes y el objetivo en `ComisionAgenteDetalle`, igual que en el
  vendedor.

## Caídas

Un título se **cae** cuando acumula **6 cuotas consecutivas impagas** (Balta,
24/08/2026). La caída **no genera contracargo** y no toca ninguna comisión: es
información, para saber a quién llamar. La regla vive en `lib/padron/caidas.ts`,
función pura y testeada; el estado derivado se guarda en `Titulo` porque el
listado de clientes filtra y cuenta por él.

- **La racha se cuenta desde la cuota más alta hacia atrás**, y sólo mientras la
  numeración sea contigua. No es "cuántas impagas tiene en total": un cliente que
  se atrasó ocho meses y se puso al día no está caído.
- **El sistema tiene que poder decir "no sé".** Si falta un número de cuota en el
  medio del histórico, esa cuota pudo estar paga; contarla como impaga inventaría
  una caída. Ahí la racha se corta y el título queda `caidaConfiable = false`, que
  en pantalla es *"sin datos suficientes"* y nunca *"al día"*. La excepción: si la
  racha ya llegó a 6, que falte historia hacia atrás no la desmiente.
- **Sin histórico no hay caídas que detectar, y eso se dice en pantalla.** Cada
  padrón trae 3 meses, así que con uno solo ningún título puede llegar a 6: hacen
  falta unos 4 archivos consecutivos. Mostrar "0 caídas" ahí sería mentir.
- **Caída parcial vs. total** es del cliente, no del título: parcial cuando sólo
  algunos de sus títulos cayeron, total cuando todos.
- **Se recalcula dentro de la transacción de la importación**, sólo para los
  títulos de ese archivo y escribiendo únicamente los que cambiaron. Para la
  primera pasada sobre títulos ya cargados está `scripts/recalcular-caidas.ts`
  (y el mismo botón en el laboratorio).
- `Titulo.cuotasPagas` viene del club y **no** decide la caída —dice cuántas pagó
  en total, no si dejó de pagar seguidas—, pero se contrasta: si cubre hasta la
  última cuota que conocemos, se avisa que el club lo da al día.

## El formulario de venta

Los campos los definió Balta el 27/08/2026 (ver `docs/PLAN.md`, Fase 6). Dos de
ellos no son ni obligatorios ni opcionales siempre:

- **Nro Suscripción** es obligatorio, **salvo** que se cargue **Título**. Es como
  identifica el club a una venta: arranca con un número de suscripción y cuando
  le asignan el título definitivo, ese pasa a ser el identificador. Una venta sin
  ninguno de los dos no se puede rastrear.
- **Observación** es obligatoria cuando hay Nro Suscripción.

Las dos se validan en `ventaSchema` con `superRefine`, **en el servidor**: la
pantalla mueve el asterisco mientras se escribe, pero el formulario es un
endpoint y se puede mandar sin pasar por el navegador.

- **Los campos "Número" se guardan como texto de dígitos, nunca como enteros.**
  Un DNI, un teléfono, un número de suscripción y un título son identificadores,
  no cantidades: no se suman, y como número se rompen los que empiezan con cero
  (`0387…`). Se acepta escribirlos con espacios, guiones y paréntesis y se
  limpian al guardar.
- **`Venta.numeroTitulo` es lo que anota el vendedor; `Venta.tituloId` es el
  título que el sistema encontró en el padrón.** No son lo mismo y la ficha los
  muestra por separado: al cargar la venta ese título todavía no existe en el
  sistema, porque llega recién con el padrón siguiente.
- **La foto del DNI es opcional**: frenaba el alta de ventas cargadas desde la
  calle. Se sube después editando la venta.
- Localidad, provincia y débito automático salieron del formulario, pero **las
  columnas siguen**: las ventas viejas las tienen cargadas.

## Formularios y avisos

Dos trampas que ya costaron un rato cada una y no se ven leyendo el código.

- **Un toast lanzado desde un `useEffect` no se ve si el formulario desaparece al
  guardar.** La server action revalida, la pantalla vuelve sin ese formulario y el
  componente se desmonta en el mismo commit en que llega el estado nuevo: el
  efecto no llega a correr. Es lo que pasaba en `crear-usuario-form.tsx`, donde el
  toast no está por eso y no por olvido. El toast sirve cuando el formulario sigue
  en pantalla después de guardar (`form-contacto.tsx`).
- **El éxito de una acción se marca con `estado.ok`, nunca con "no hay errores".**
  El estado inicial de `useActionState` es `{}`: es *truthy* y no tiene errores,
  así que "no hay errores" da verdadero antes de que nadie haya enviado nada.
- **Los errores de duplicado ya no traen `meta.target`.** Con `@prisma/adapter-pg`
  el detalle del P2002 lo pone el driver, en
  `meta.driverAdapterError.cause.constraint.fields`. Para eso está
  `camposDuplicados()` en `lib/errores-prisma.ts`, que mira las dos formas y tiene
  tests: si vuelve a cambiar, sin eso los formularios dejan de decir **qué** dato
  está repetido y contestan un "Datos duplicados." inútil, sin que se rompa nada
  visible.

## Gráficos

Los tres gráficos del dashboard son **SVG y divs renderizados en el servidor**,
no Recharts. La librería está en `package.json` pero no la importa nadie: usarla
obligaría a volver de cliente pantallas que hoy no lo son, a cambio de nada que
haga falta todavía. El tooltip es el `title` nativo.

- **Los colores de serie salen de `--chart-*` y se validan, no se eligen a ojo.**
  **Rojo (`--chart-1`) y verde (`--chart-2`) no se pueden usar juntos**: bajo
  deuteranopia quedan a un ΔE de 4,9 y son el mismo color. El par que pasa en los
  dos modos es `--chart-1` con `--chart-4`. Ningún color de serie baja de 0.1 de
  croma, porque por debajo de eso se lee como gris.
- **Una serie ordenada lleva rampa de un solo tono, no colores distintos.** Los
  meses de la torta van del más claro (viejo) al más oscuro (nuevo): el color
  dice el orden. Los pasos son `--serie-1` a `--serie-6`, y en modo oscuro se
  invierten con sus propios valores medidos contra el fondo oscuro.
- **El texto nunca lleva el color de la serie.** El color va en la marca —el
  cuadradito de la leyenda, la barra, el gajo—; las etiquetas y los importes van
  en tinta.
- **Al lado de la torta va siempre la lista con los importes.** Comparar ángulos
  se hace mal; el reparto se ve en el dibujo y el número se lee escrito.
- **"No se sabe" no se dibuja como cero.** El primer padrón de una zona no tiene
  con qué comparar, así que su barra va gris y dice "sin comparación". Es la
  misma regla que las caídas: mostrar un cero sería afirmar algo que no consta.

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

### `ERROR Lock file is already being held`

Si la base no arranca con ese error, quedó un lock huérfano: `prisma dev` lo
toma al iniciar y sólo lo suelta si se lo cierra bien (Ctrl+C). Si se lo mata a
la fuerza —`taskkill /F`, matar la terminal, un `timeout` que corta el
proceso—, el lock queda tomado y el siguiente arranque falla. Como `npm run dev`
usa `concurrently -k`, la web se cae junto con la base y parece que se rompió
todo.

No hay que borrar los datos: el lock es un directorio aparte. Con la base
apagada, se borra y listo:

```bash
rm -rf "$LOCALAPPDATA/prisma-dev-nodejs/Data/durable-streams/crm-csj/server.lock.lock"
```

En PowerShell:

```powershell
Remove-Item -Recurse -Force "$env:LOCALAPPDATA\prisma-dev-nodejs\Data\durable-streams\crm-csj\server.lock.lock"
```

Antes de borrarlo hay que confirmar que no quede ningún `prisma dev` vivo, o se
va a tomar de nuevo. Los datos viven en `.../Data/crm-csj/.pglite` y no se tocan.

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
