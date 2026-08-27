# Plan de trabajo — cambios acordados con Balta (24/08/2026)

Documento vivo. Sale de `docs/cambios 24-8.txt` (las anotaciones de Lisandro) más
las respuestas de Balta y la adenda del contrato de agencia.

El contexto del negocio está en [`../CLAUDE.md`](../CLAUDE.md); el estado general
del sistema, en [`PENDIENTE.md`](PENDIENTE.md). Acá va **sólo este plan y su
avance**.

---

## Cómo se trabaja — LEER ANTES DE EMPEZAR

Reglas acordadas con Lisandro. Valen para toda sesión que retome este plan.

1. **Una fase por sesión.** Se arranca por la primera fase que no esté marcada
   como hecha en la tabla de abajo.

2. **Al terminar una fase, SIEMPRE hay que entregar los pasos exactos para
   probarla visualmente.** No alcanza con decir "está hecho" ni con mostrar que
   los tests pasan: Lisandro necesita abrir el navegador y ver el cambio con sus
   propios ojos. Los pasos van en el chat **y** quedan asentados en la sección
   [Cómo probar cada fase](#cómo-probar-cada-fase) de este archivo.

   Cada guía de prueba tiene que incluir:
   - qué datos hacen falta y cómo cargarlos (comando o pasos en la UI),
   - la ruta exacta a abrir,
   - qué tiene que verse en pantalla,
   - qué números tendrían que dar, cuando hay cálculo de por medio,
   - cómo borrar los datos de prueba después.

3. **Marcar la fase recién cuando Lisandro confirme que está OK.** No cuando el
   código compile. Cuando él avise, hay que:
   - poner la fase en ✅ en la tabla de estado,
   - escribir en la fase qué quedó hecho y cualquier cosa que la próxima sesión
     necesite saber,
   - actualizar [Contexto para la próxima sesión](#contexto-para-la-próxima-sesión),
   - commitear este archivo.

4. **Datos de prueba: siempre ficticios y marcados.** Nada de inventar un DNI que
   podría ser el de una persona real. Los datos de prueba usan DNI `99999999`,
   `99999998`… y códigos que empiezan con `PRUEBA-`, y se borran con un comando
   que se entrega junto con los pasos.

5. **Los commits van sin firma ni marcas de Claude.**

6. **Control antes de cada commit:** `npm run lint` · `npm test` · `npm run build`.
   Las fases que tocan la importación agregan
   `npx tsx scripts/verificar-padron.ts "docs/Padron-siscaho-tucu-167-010626.xls" --limpiar`.

---

## Estado de las fases

Estados: ⬜ pendiente · 🔨 construida, esperando que Lisandro la valide · ✅ validada.

| # | Fase | Estado |
|---|---|---|
| 0 | Balta y Pedro también son vendedores | ✅ commit `3a06dce` |
| 0.5 | Datos de prueba auditables | ✅ `scripts/datos-prueba.ts` |
| 0.6 | Laboratorio: base de desarrollo con datos ficticios | ✅ `/admin/laboratorio` |
| 1 | Escalas de comisión por vendedor | ✅ commit `7dbc4ea` |
| 2 | Renovaciones y pestaña Padrón | ✅ commit `c47735b` |
| 3 | Comisión del agente (Balta y Pedro) | ✅ commit `f81e22e` |
| 4 | Caídas de clientes | ✅ commit `23d97fe` |
| 5 | Gráficos del dashboard | ✅ commit `816628f` |
| 6 | Formulario de venta | 🔨 en curso |

Dependencias:

```
Fase 0  Balta/Pedro vendedores ──┬──> Fase 3  Comisión del agente ──┬──> Fase 5  Gráficos
Fase 1  Escalas por vendedor ────┘                                  │
Fase 2  Renovaciones + padrón ──────────────────────────────────────┘
Fase 4  Caídas          (independiente, necesita padrones cargados)
Fase 6  Formulario      (bloqueada por definición de Balta)
```

---

## Definiciones confirmadas por Balta

| Tema | Definición |
|---|---|
| Escala por vendedor | Se mantienen **los dos ejes**: tramos de ventas del mes × % por cuota. Lo que cambia es que hay varias escalas y cada vendedor se asigna a una. |
| Renovación | Título que **no estaba en el padrón anterior** y aparece con cuota > 1. Si aparece con cuota 1, es venta nueva. |
| Cómo cobra la renovación | **No** suma al volumen del tramo. Cobra el % de la cuota real; arriba de la cuota 5 no cobra nada. |
| Comisión del agente | Sobre las cuotas pagas de sus ventas **y** las de su equipo, según la escala del contrato de agencia. |
| Base de cálculo | El `Importe` del padrón **ya es la cuota pura**. Se aplica el % tal cual, sin descontar nada. |
| A quién se le liquida la comisión del agente | **Un número por zona**, no por agente. Balta quiere ver el de Salta y el de Tucumán; no se reparte la producción entre él y Pedro. |
| Objetivo de contratos del mes | **Tucumán 50, Salta 100.** Las renovaciones **sí** cuentan para el objetivo (a diferencia del tramo del vendedor, donde no suman). |
| Gastos de representación del agente | **No se suman a la comisión**: van aparte, como balance. El importe se edita a mano porque el club lo aumenta por inflación. |
| Contrato de agencia de Balta y Pedro | **Es el mismo para los dos.** Los porcentajes no difieren. |
| Caída | 6 cuotas **consecutivas** impagas; en la 7ª ya está caída. |
| Caída parcial / total | Parcial: el cliente tiene varios títulos y algunos están caídos. Total: todos. |
| Caída y comisión | La caída **no** genera contracargo. Es información solamente. |
| Zonas de Balta/Pedro | Ambos pueden aparecer en las dos. |

### Contrato de agencia (adenda del 13/01/2023, vigente)

Es lo que **el club le paga a Balta y Pedro**, distinto de lo que ellos le pagan
a sus vendedores.

| Cuotas pagas | % s/ cuota pura |
|---|---|
| 1ª – 2ª | 25 % |
| 3ª – 4ª | 20 % |
| 5ª | 10 % |
| 6ª – 60ª | 4 % |
| 61ª en adelante | 2 % |

- Mínimo de **50 contratos mensuales** para que aplique el esquema.
- Gastos de representación: **$215.000**, ajustables bimestralmente por IPC del
  INDEC. Para agentes con más de 15 años y producción mínima de 50 contratos,
  un 50 % más.
- Base: Ahorro + Sorteo + Carga Administrativa. Sin impuestos ni cuotas de
  suscripción. **Balta confirmó que el `Importe` del padrón ya es esa base.**

---

## Las fases en detalle

### ✅ Fase 0 — Balta y Pedro también son vendedores

Commit `3a06dce`. Verificada en la app con 9 chequeos automáticos, más lint,
46 tests, `tsc` y build.

Qué se hizo:

- **La ficha de `Vendedor` pasó a ser por zona.** El DNI es único dentro de la
  zona (como en `Cliente`) y `userId` dejó de ser único, así una cuenta puede
  tener una ficha en Salta y otra en Tucumán. Antes cualquiera de las dos
  restricciones lo impedía. Migración `20260825001735_vendedor_ficha_por_zona`.
- **`User.vendedor` pasó a `User.vendedores`** (uno a muchos). Impactó
  `lib/sesion.ts` y `lib/auth.ts`: para un VENDEDOR se toma su única ficha; para
  un ADMIN, `vendedorId` queda en null y la ficha correcta la resuelve
  `getVendedorDelAdmin()` según la zona activa.
- **La ficha del agente se engancha a su cuenta de admin** desde
  `/admin/vendedores/[id]` (`components/vendedores/ficha-agente.tsx`), en vez de
  crearle una cuenta de vendedor con la que nunca entraría. Esa tarjeta oculta
  los switches de permisos: un admin ve todo por su rol, así que apagarlos no
  haría nada.
- **`/admin/ventas/nueva`**: alta de venta desde admin con select de vendedor.
  El cuerpo del alta se extrajo a `registrarVenta()` en
  `app/vendedor/ventas/actions.ts` para que las dos puertas de entrada compartan
  validación de adjuntos, transacción y marcado del lead.
- **Dashboard**: "Comisiones del mes" se partió en "Mi comisión del mes" y
  "Comisiones del equipo".

> Ojo: lo que se ve ahí es la comisión **como vendedor**. Lo que el club les paga
> **como agentes** es la Fase 3.

### ✅ Fase 0.5 — Datos de prueba auditables

Antes de tocar comisiones hace falta un juego de datos que Lisandro pueda
verificar con una calculadora. El padrón real tiene 6.878 filas y cuotas de
$107.293: no hay forma de auditarlo mentalmente.

Hecho en `scripts/datos-prueba.ts`, con subcomandos `cargar` y `borrar`.

- Escenario chico con importes redondos ($100.000, $200.000) y dos vendedores.
  Cubre a propósito los tres casos donde el cálculo suele fallar:
  - **un vendedor sin ventas nuevas**, que igual cobra sus cuotas viejas al tramo
    más bajo (por eso siempre tiene que existir un tramo con `ventasMin = 0`),
  - **una cuota que pasa el tope** del vendedor y hay que descartar,
  - **varias cuotas del mismo número**, que se agrupan en un solo renglón.
- Todo marcado como ficticio: DNI `9999xxxx`, códigos `PRUEBA-*`, títulos `PRU-*`.
- Imprime **la cuenta paso a paso y el total esperado**, para comparar contra la
  pantalla.

> La cuenta del script se hace con aritmética propia y **no** llama a
> `calcularComisionPeriodo`. Si usara el motor estaría comparando el motor consigo
> mismo y no probaría nada: el valor está en que dos caminos independientes den el
> mismo número.

Verificado: el motor devuelve exactamente lo mismo que la cuenta a mano
($55.000 y $44.000 en el escenario por defecto).

### ✅ Fase 0.6 — Laboratorio: base de desarrollo con datos ficticios

Trabajar en desarrollo contra el padrón real era incómodo (6.878 filas, cuotas de
$107.293) y además metía datos personales de miles de clientes reales en una base
de pruebas. Ahora la base de desarrollo se puede vaciar y recargar con datos
ficticios **desde la aplicación**, sin consola.

- **`/admin/laboratorio`**, en el menú. Muestra qué hay cargado, separando lo que
  se borra de lo que se conserva, y tiene tres botones: vaciar el padrón de la
  zona, crear los vendedores de prueba con sus alias, y cargar una escala
  completa de c1 a c5.
- **La ruta devuelve 404 en producción**, y las acciones vuelven a chequearlo por
  su cuenta: una server action es un endpoint y se puede invocar sin pasar por la
  pantalla, así que el corte no puede vivir sólo en el componente.
- Vaciar pide **escribir el nombre de la zona**, como pedir el nombre del repo
  antes de borrarlo.
- **`scripts/generar-padrones-prueba.ts`** escribe 7 padrones `.xlsx` en
  `docs/padrones-prueba/` (ignorada por git, se regeneran). Tienen la misma forma
  que los del club: 3 emisiones por título, solapadas de a 2 con el padrón
  anterior, fechas como serial de Excel.

Los archivos son la forma correcta de cargar estos datos porque **la importación
es justamente lo que hay que probar**: el upsert idempotente, la detección de
renovaciones (Fase 2) y las caídas (Fase 4) sólo se ven con padrones sucesivos.

El escenario cubre: dos ventas nuevas, un título en curso, uno viejo (cuotas
54-60, tramo 6-60 del agente), uno muy viejo (cuotas 102+, tramo 61+), una
**renovación** que aparece en septiembre con cuota 5, un título que **se cae** y
otro del mismo cliente que sigue pagando, para que quede como **caída parcial**.

Verificado end-to-end: vaciar, crear vendedores, importar los 7 padrones y
liquidar. Los totales se controlaron a mano y coinciden.

### ✅ Fase 1 — Escalas de comisión por vendedor

Se mantienen los dos ejes; lo que cambia es que hay varias escalas y cada
vendedor se asigna a una. **El motor no se tocó**: `calcularComisionPeriodo`
sigue recibiendo las filas por parámetro, sin saber que existen varias escalas.

Qué se hizo:

- **Tabla nueva `Escala`** (`nombre`, `esPredeterminada`). `EscalaComision`
  cuelga de una escala (`escalaId`, `onDelete: Cascade`), con la clave
  `@@unique([escalaId, ventasMin, numeroCuota])`. `Vendedor.escalaId` es
  opcional: sin asignación explícita, usa la que tenga `esPredeterminada`.
  Migración `20260826153914_escalas_por_vendedor`: crea la escala "General"
  predeterminada y le imputa todos los tramos que ya existían, antes de exigir
  que la columna sea `NOT NULL`.
- **`listarEscalas(escalaId)`** pasa a pedir una escala puntual.
  **`escalasDeVendedores(vendedores)`** nueva en `lib/comisiones/liquidacion.ts`:
  resuelve para cada vendedor cuál escala le toca (la propia o la
  predeterminada) y trae los tramos de todas las escalas involucradas en una
  sola consulta, en vez de una por vendedor. `obtenerLiquidacion` y
  `obtenerLiquidacionVendedor` la usan en vez de la escala única de antes.
- **`/admin/comisiones/escalas`** pasó de ser el editor de una escala a un
  listado: nombre, cuántos tramos y cuántos vendedores tiene asignados cada
  una, badge de predeterminada, y acciones para crear, renombrar, marcar como
  predeterminada y eliminar (bloqueado si es la predeterminada o si algún
  vendedor la tiene asignada). El editor de tramos de siempre pasó a
  `/admin/comisiones/escalas/[id]`, sin cambios de fondo.
- **Select de escala** en el alta y edición del vendedor
  (`components/vendedores/vendedor-form.tsx`), y el dato en su ficha y en el
  detalle de su comisión (`/admin/comisiones/vendedor/[id]`, campo "Escala
  aplicada"), para poder ver a simple vista cuál le tocó sin adivinar.
- Laboratorio y `scripts/datos-prueba.ts` actualizados: la "escala de ejemplo"
  ahora se carga en la escala predeterminada (la crea si hace falta) en vez de
  en una tabla sin cabecera.

> El `escalaId` va en una tabla cabecera y no como `vendedorId` nullable en
> `EscalaComision` a propósito: en Postgres cada `NULL` es distinto y la clave
> única no impediría escalas duplicadas.

Verificado con un script ad-hoc contra la base real (no versionado): se cargó
el escenario de la Fase 0.5, se creó una segunda escala con porcentajes
distintos para las cuotas c3 y c5, se la asignó a PEREZ ANA (prueba) y
`obtenerLiquidacion` reflejó el cambio ($44.000 → $22.000) sin mover a GOMEZ
JUAN (prueba), que se quedó en la predeterminada. Lint, 46 tests y build
pasan.

### ✅ Fase 2 — Renovaciones y pestaña Padrón

Commit `c47735b`. Validada por Lisandro el 27/08/2026.

Los dos puntos tocaban `PadronImport`, así que fueron **una sola migración**:
`20260826212416_origen_de_titulo`.

Qué se hizo:

- **Enum `TituloOrigen { VENTA_NUEVA, RENOVACION, BASE }`**, con `Titulo.origen`
  y `Titulo.cuotaInicial`. La regla vive en `lib/padron/origenTitulo.ts`, aparte
  y como función pura para poder testearla sin base: primera importación de la
  zona → todo `BASE`; después, un título que no existía entra por su cuota más
  baja del archivo, y esa cuota decide (1 = venta nueva, > 1 = renovación).
- **El origen se sella una sola vez**, cuando el título se crea. No se recalcula
  en cada importación: si se hiciera, un título pasaría de venta nueva a
  renovación apenas el padrón dejara de traer su cuota 1.
- **`PadronImport` guarda todo lo que ya calculaba y tiraba**:
  `clientesActualizados`, `titulosActualizados`, `cuotasSinCambios`, más
  `titulosNuevosVenta`, `titulosNuevosRenovacion` y `esLineaBase`. La migración
  hace el backfill: `cuotaInicial` sale de la cuota más baja conocida de cada
  título, y `esLineaBase` queda en true para la primera importación de cada zona.
- **El panel de cifras se compartió** (`components/padron/panel-resumen.tsx`):
  el mismo que muestra el preview de análisis aparece ahora en `/admin/padron`
  para la última importación, con "Ventas nuevas" y "Renovaciones" destacadas.
  Antes esos números se veían una sola vez y se perdían al confirmar. En el
  histórico, cada fila muestra el desglose `N vta · N renov`.
- **El origen también se ve por título** en la ficha del cliente, como badge
  ("venta nueva · entró en la cuota 1").
- **El cálculo de comisiones no cambió**: la renovación no trae cuota 1, así que
  no mueve el tramo, y sus cuotas cobran el % de la cuota real dentro del tope.
  Eso ya funcionaba solo, porque el motor únicamente mira números de cuota; se
  agregaron tres tests (`describe("renovaciones")`) para que siga siendo así.

Verificado en tres niveles: los tests de la función pura y del motor (55 en
total, 9 nuevos), el escenario de padrones de prueba importado de punta a punta contra la
base local (el padrón 01 queda como línea base con 5 títulos, el 02 trae 2
ventas nuevas y el 04 la renovación PT-0006 por la cuota 5), y
`scripts/verificar-padron.ts` contra el padrón real de 6.878 filas, que además
ahora comprueba el origen (paso 6) y sigue dando TODO OK.

> La base de desarrollo quedó otra vez con los 7 padrones ficticios: la
> verificación con el padrón real carga datos personales de miles de clientes y
> se vació apenas terminó.
>
> El primer padrón trae 6 títulos y no 5 desde que la Fase 4 sumó `PT-0009` al
> escenario. Los números de comisión no cambiaron.

### ✅ Fase 3 — Comisión del agente

Commit `f81e22e`. Validada por Lisandro el 27/08/2026.

Motor nuevo, hermano del de vendedores. La fase que más plata mueve. Migración
`20260827015729_comision_agente`.

Qué se hizo:

- **`EscalaAgente`** (`zonaId`, `cuotaDesde`, `cuotaHasta`, `porcentaje`), con
  `ComisionAgentePeriodo` + `ComisionAgenteDetalle` como espejo de los de
  vendedor y el mismo cierre que congela porcentajes. La unidad es **la zona**,
  no el agente: Balta quiere el número de Salta y el de Tucumán, sin repartir la
  producción entre él y Pedro.
- **La migración siembra el contrato vigente** (25/20/10/4/2) en las dos zonas y
  el objetivo mensual (`Zona.objetivoContratosMensual`: Salta 100, Tucumán 50).
  Es un punto de partida para que el sistema arranque liquidando, no un
  porcentaje hardcodeado: de ahí en más manda lo que esté cargado en la tabla, y
  se edita en `/admin/comisiones/agente/escala`.
- **`lib/comisiones/calcularComisionAgente.ts`**: función pura con 19 tests.
  Recibe **todas** las cuotas cobradas de la zona, sin filtrar por vendedor y
  **sin el tope de c1-c5**. Aritmética en centavos, como el motor de vendedor.
  Agrupa **por tramo del contrato**, no por número de cuota: así se lee el
  contrato y así se controla contra lo que liquida el club.
- **No usa `CUOTAS_COMISIONABLES`**: esa constante llega hasta 5 y es del
  vendedor. En el escenario de prueba, 38 de 54 cuotas caen fuera de c1-c5 y son
  $214.000 de los $564.000; en el padrón real son 5.482 de 6.878 filas.
- **El objetivo cuenta ventas nuevas + renovaciones** (Balta, 27/08/2026) y se
  mide por `Titulo.createdAt` con `origen != BASE`: un contrato cuenta en el mes
  en que el sistema lo vio por primera vez, igual que `detectadaPagaAt` para las
  cuotas. Si no se llega, advertencia visible; **no bloquea** el cálculo, porque
  falta saber a qué esquema vuelve el club.
- **Los gastos de representación NO se suman a la comisión**: van aparte, en el
  balance del mes, con el importe editable a mano (el club lo ajusta por
  inflación). El cálculo del IPC queda fuera de alcance.
- **`/admin/comisiones/agente`**: renglón por tramo, balance del mes, contratos
  contra el objetivo, y el detalle por número de cuota como auditoría (agregado
  en la base, no trae miles de filas). Avisa cuando el período incluye la
  primera importación de la zona, que sin tope de cuota queda muy inflado.
- **Dashboard**: "Comisión del club" y "Margen de la agencia" (comisión del club
  menos lo que se le paga al equipo; los gastos de representación no entran).
- **Laboratorio**: botón para restaurar el contrato de agencia de la zona activa
  después de haber estado probando porcentajes.

Verificado en dos niveles: los 19 tests de la función pura, y un script ad-hoc
contra la base local (no versionado) que reimporta los 7 padrones de prueba y
compara el total del motor contra una cuenta hecha con aritmética propia —
$564.000 sobre $7.800.000 cobrados—, más el cierre, el congelamiento y la
reapertura. Lint, 74 tests y build pasan.

### ✅ Fase 4 — Caídas de clientes

Commit `23d97fe`. Validada por Lisandro el 27/08/2026. Migración
`20260827023523_caidas_de_titulos`.

> **Aclaración para Balta**: el sistema no necesita "cargar 7 padrones" como
> mecanismo; necesita **6 cuotas consecutivas de histórico por título**. Como cada
> padrón trae 3 meses y se solapan, con padrones mensuales seguidos eso son unos
> 4 archivos. Lo que sí es cierto es que sin ese histórico no se puede detectar
> nada, y el sistema lo dice en pantalla en vez de mostrar cero caídas.
>
> Se comprobó contra el padrón real: con **un solo** padrón cargado, ninguno de
> los 2.334 títulos puede darse por caído —trae 3 meses, nunca 6— y 436 quedan
> como "sin datos suficientes". Eso es lo correcto, y es exactamente lo que
> antes se hubiera visto como "no hay ninguna caída".

Qué se hizo:

- **`lib/padron/caidas.ts`**: función pura con 23 tests. Cuenta la racha de
  impagas **desde la cuota más alta hacia atrás**, y sólo mientras la numeración
  sea contigua. Un título se cae con `IMPAGAS_PARA_CAIDA = 6`; desde
  `IMPAGAS_PARA_RIESGO = 3` se muestra en riesgo.
- **La parte que importa es saber cuándo no se sabe.** Si falta un número de
  cuota en el medio, esa cuota pudo estar paga: contarla como impaga inventaría
  una caída. En ese caso la racha se corta ahí y el título queda
  `caidaConfiable = false`, que en pantalla es *"sin datos suficientes"* y no
  *"al día"*. La excepción: si la racha **ya llegó a 6**, que falte historia
  hacia atrás no la desmiente —más impagas sólo la alargarían—, así que ahí sí
  se afirma.
- **`Titulo`** guarda el derivado: `impagasConsecutivas`, `cuotaUltimaPaga`,
  `cuotaMinConocida`, `cuotaMaxConocida`, `caidoAt` y `caidaConfiable`. Se
  guarda en vez de calcularse al vuelo porque el listado filtra y cuenta por él;
  hacerlo en memoria obligaría a traer el histórico entero de la zona en cada
  visita.
- **Se recalcula dentro de la transacción de la importación**
  (`lib/padron/recalcularCaidas.ts`), sólo para los títulos que trae el archivo
  y escribiendo únicamente los que cambiaron: reimportar el mismo padrón no toca
  nada, ni siquiera la fecha de caída.
- **`scripts/recalcular-caidas.ts`** para la primera pasada sobre títulos que ya
  estaban cargados, y el mismo botón en el Laboratorio para no depender de la
  consola. Los defaults de la migración dejan todo como "sin datos suficientes",
  que es la verdad hasta que se lo corra.
- **La caída no se calcula en SQL** aunque se pueda: la regla ya está en
  TypeScript con tests, y la parte difícil —distinguir *"no pagó"* de *"no lo
  vimos"*— es justamente la que no conviene escribir dos veces.
- **`/admin/clientes`**: chips de filtro con contadores (caída total, parcial, en
  riesgo, sin datos suficientes), columna de estado y badge en la tarjeta móvil.
  Un cliente está en caída **total** cuando todos sus títulos cayeron y
  **parcial** cuando sólo algunos.
- **Ficha del cliente**: badge por título, última cuota paga, rango del histórico
  conocido, fecha de caída, y dos avisos: por qué no alcanza el historial, y
  cuándo `Titulo.cuotasPagas` (el dato del club) **contradice** lo que vemos
  —típicamente porque la cuota se cobró después de emitido el padrón—.
- **Al terminar una importación** se avisa cuántos títulos de ese padrón quedaron
  caídos.
- La caída **no toca ninguna comisión**, como confirmó Balta. Se verificó: con el
  escenario de prueba, los totales de las fases 2 y 3 no se movieron
  ($105.000 · $38.000 · $564.000).

Verificado en tres niveles: los 23 tests de la función pura; un script ad-hoc
contra la base local (no versionado) que reimporta los 7 padrones de prueba y
compara título por título contra una cuenta hecha recorriendo el histórico a
mano; y `scripts/verificar-padron.ts` contra el padrón real de 6.878 filas, que
ahora comprueba también las caídas (paso 7) y sigue dando TODO OK. Lint, 97
tests y build pasan.

> El escenario de prueba creció con un título nuevo, **`PT-0009` de HUGO
> PRUEBA**: el club lo lista en el primer padrón (cuotas 16 a 18) y recién
> vuelve a listarlo en el último (22 a 24). Las cuotas 19, 20 y 21 nunca se
> vieron, así que es el caso de "sin datos suficientes". Ninguna de sus cuotas
> está paga, así que **no movió ningún número de las fases anteriores**; lo único
> que cambia es que el primer padrón ahora trae 6 títulos en vez de 5, y que hay
> 8 clientes de prueba en vez de 7.

> Arreglo de paso: `lib/db.ts` limitaba el pool de conexiones mirando
> `NODE_ENV === "development"`, y los scripts de `scripts/` corren sin esa
> variable, así que se quedaban sin límite y morían con *"Connection terminated
> unexpectedly"* contra la base local. Ahora el corte mira el host.

### ✅ Fase 5 — Gráficos del dashboard

Commit `816628f`. Validada por Lisandro el 27/08/2026.

Sin migración: las dos series salen de tablas que ya se llenaban solas.

Qué se hizo:

- **Torta de comisiones** (`components/dashboard/comisiones-por-mes.tsx`). Sale
  de `ComisionAgentePeriodo` y toma **sólo los meses cerrados**, con la
  aclaración escrita en la tarjeta: un mes en borrador se sigue moviendo con
  cada padrón que entra, así que se mostraría más chico de lo que va a terminar
  siendo.
- **Barras de producción** (`components/dashboard/produccion-por-padron.tsx`).
  Los últimos 5 padrones, con los títulos nuevos partidos en venta nueva y
  renovación, desde `PadronImport` (Fase 2).
- **Se quitaron dos tarjetas del dashboard** a pedido de Lisandro: *Leads sin
  asignar* y *Clientes en padrón*. Quedan 6. Sus consultas se sacaron también,
  así que el dashboard hace cuatro queries menos.
- Las consultas nuevas viven en `lib/dashboard/graficos.ts`, y la única lógica
  que se puede equivocar en silencio —qué paso de color le toca a cada mes— está
  aparte y testeada en `lib/dashboard/rampa.ts`.

**El gráfico no usa Recharts**, aunque el plan lo decía. La librería está
instalada pero no la usaba nadie: `cobranza-por-mes.tsx` siempre fue CSS
renderizado en el servidor. Los dos gráficos nuevos siguen ese camino —SVG y
divs, sin JavaScript de cliente ni hidratación—, que además es lo que permite
que sean componentes de servidor como el resto del dashboard.

**Sobre el color**, que fue la parte que más cambió respecto de lo obvio:

- **Rojo y verde no se pueden usar juntos.** Era la combinación natural para
  "ventas nuevas vs. renovaciones" y el chequeo de daltonismo la rechaza: bajo
  deuteranopia quedan a un ΔE de 4,9, o sea indistinguibles. El par que quedó es
  `--chart-1` (rojo) con `--chart-4` (azul), que pasa en claro y en oscuro.
- **`--chart-4` y `--chart-5` tenían croma 0.09**, por debajo del piso de 0.1 a
  partir del cual un color deja de leerse como color y pasa por gris. Subieron a
  0.11.
- **La torta usa una rampa de un solo tono, no seis colores.** Los meses tienen
  orden, así que el color lo muestra: del más viejo (claro) al más nuevo
  (oscuro). En modo oscuro la rampa se invierte, con sus propios pasos medidos
  contra el fondo oscuro, no dando vuelta los de claro.
- **Una torta es mala para comparar valores parecidos** —el ojo mide mal los
  ángulos—, así que al lado va la lista con el importe y el porcentaje de cada
  mes. El reparto se ve en el dibujo y el número se lee escrito.
- **La línea base no se dibuja como cero.** En el primer padrón de una zona no
  hay con qué comparar, así que no se sabe cuáles títulos eran ventas: esa barra
  va gris y dice "sin comparación". Pintarla en cero estaría diciendo que ese mes
  no se vendió nada, que es otra cosa.

Verificado mirando la pantalla renderizada, en claro y en oscuro, además de lint,
102 tests y build. Ahí salieron dos defectos que no se veían en el código: la
barra no se dibujaba (un `height` en porcentaje contra un padre de alto
automático da cero) y la leyenda decía "Marzo De 2026".

### 🔨 Fase 6 — Formulario de venta

Migración `20260827173116_campos_formulario_venta`. Los campos los definió Balta
armándolos en el prototipo y los pasó por captura de pantalla el 27/08/2026.

| # | Campo | Tipo | Obligatoriedad |
|---|---|---|---|
| 1 | Plan | Desplegable | Siempre |
| 2 | Nro Suscripción | Número | Sí, **salvo** que se cargue Título |
| 3 | D.N.I | Número | Siempre |
| 4 | Nombre y Apellido | Texto | Siempre |
| 5 | Calle Nro y Barrio | Texto | Siempre |
| 6 | Teléfono | Número | Siempre |
| 7 | Título | Número | Opcional |
| 8 | Observación | Área de texto | Sí **si** se cargó Nro Suscripción |

Qué se hizo:

- **Tres campos nuevos en `Venta`**: `nroSuscripcion`, `numeroTitulo` y
  `observacion`.
- **Las dos reglas condicionales se validan en el servidor**, en `ventaSchema`
  con un `superRefine`, y no sólo en la pantalla: el formulario es un endpoint y
  se puede mandar sin pasar por el navegador. Tienen 15 tests.
- **En la pantalla, el asterisco se mueve mientras se escribe.** Al cargar el
  título, "Nro Suscripción" deja de ser obligatorio y lo dice; al cargar la
  suscripción, "Observación" pasa a serlo. Es el mismo par de reglas, contado
  antes de que el vendedor apriete Cargar.
- **El desplegable de planes muestra sólo el nombre** y, al elegir uno, aparece
  el precio debajo, aclarando que es una referencia y no se guarda. El precio
  que vale es el que después trae el padrón.
- **La foto del DNI pasó a ser opcional.** Frenaba el alta de ventas que se
  cargan desde la calle, con el cliente adelante y sin la foto sacada. Se sube
  después editando la venta; la ficha marca las que todavía no la tienen.
- **Salieron del formulario Localidad, Provincia y Débito automático.** Las
  columnas se conservan: las ventas viejas las tienen cargadas y borrarlas sería
  perder ese dato. La ficha las muestra sólo si hay algo.

**Los campos "Número" se guardan como texto de dígitos, no como enteros.** Un
DNI, un teléfono, un número de suscripción y un título son identificadores, no
cantidades: no se suman ni se promedian, y como número se rompen los que
empiezan con cero (`0387…`). Se acepta escribirlos con espacios, guiones y
paréntesis, y se limpian antes de guardar: `(0387) 415-1234` queda
`03874151234`.

> **Para hablar con Balta.** Como "Nro Suscripción" es obligatorio salvo que
> haya título, y "Observación" es obligatoria cuando hay suscripción, en la
> práctica **la observación va a ser obligatoria en casi toda venta nueva** —el
> título recién lo asigna el club después—. Está implementado tal cual lo
> definió; si la idea era otra, se cambia en una línea.

**El prototipo (`app/admin/prototipo-formulario-venta/`) sigue sin commitear.**
No guarda nada: es `useState` puro, así que la configuración vive sólo en la
pestaña abierta y se pierde al recargar. Ahora que los campos están fijos en el
formulario real, hay que decidir si se borra o si Balta los quiere poder cambiar
solo, que es una fase aparte bastante más grande (definición de campos en base,
render dinámico y validación armada en tiempo de ejecución).

Verificado contra la aplicación levantada: las dos reglas rechazan y aceptan
donde corresponde, la venta se guarda con el teléfono `03874151234` (cero
adelante, sin símbolos) y la ficha muestra los campos nuevos. Lint, 117 tests y
build pasan.

---

## Cómo probar cada fase

### Fase 0 — Balta y Pedro también son vendedores

**Preparación**

```bash
npm run dev
```

Entrar a http://localhost:3000/login con `balta@crm-csj.local` /
`CambiarEstePassword123` y elegir la zona **Salta**.

**1. Crear la ficha de vendedor de Balta**

Menú **Vendedores** → botón **Nuevo vendedor**. Completar:

- Nombre completo: `Baltazar Ignacio Toledo Perez`
- DNI: `99999999`  *(ficticio, se borra después)*
- Código: `PRUEBA-B`
- Cobra comisión hasta: `c5`

Guardar.

**2. Enlazar la ficha a su cuenta de admin** — *esto es lo nuevo*

En la ficha recién creada, tarjeta **Cuenta de ingreso**. Abajo del formulario de
crear cuenta aparece un bloque nuevo: **"Es la ficha de un administrador"**.
Elegir `Baltazar Ignacio Toledo Perez` en el select y apretar **Enlazar**.

Tiene que verse:
- el badge con su nombre y el texto **"entra con su cuenta de admin"**,
- un botón **Desenlazar**,
- y que **desapareció la tarjeta de Permisos** (un admin ve todo por su rol, así
  que esos switches no harían nada).

**3. Comisión propia en el dashboard** — *esto es lo nuevo*

Menú **Dashboard**. Donde antes había una sola tarjeta "Comisiones del mes",
ahora hay dos:

- **Mi comisión del mes** — lo que cobra Balta por sus propios títulos. Va a dar
  `$0` hasta que se le vinculen nombres del padrón (eso se hace en la tarjeta
  "Nombres en el padrón" de su ficha, o al importar un padrón).
- **Comisiones del equipo** — el total de la zona, que es lo que se mostraba antes.

**4. Cargar una venta desde admin** — *esto es lo nuevo*

Menú **Ventas**. Arriba a la derecha hay un botón nuevo: **Cargar venta**.

Al abrirlo, el formulario tiene una tarjeta **Vendedor** arriba de todo, con
`Baltazar Ignacio Toledo Perez · PRUEBA-B` ya elegido. Completar el resto
(nombre, DNI, teléfono, plan) y **adjuntar una foto de DNI**, que es obligatoria
—sirve cualquier imagen—. Al guardar, vuelve a `/admin/ventas` con la venta
arriba de todo, a nombre de Balta.

**5. La ficha es por zona**

Cambiar a **Tucumán** con el selector de arriba a la izquierda y volver al
Dashboard: la tarjeta "Mi comisión del mes" **no** aparece, porque Balta todavía
no tiene ficha en esa zona. Se puede repetir el paso 1 con el mismo DNI
`99999999` y código `PRUEBA-B`: antes eso era imposible (el DNI era único en
toda la tabla) y ahora funciona, porque cada zona lleva su propia ficha.

**Borrar los datos de prueba**

Desde `/admin/vendedores`, entrar a la ficha y usar **Dar de baja**; o pedirle a
Claude que corra el borrado por script. Si se cargó la venta de prueba, borrarla
primero desde `/admin/ventas`.

### Fase 0.5 — Datos de prueba auditables

Sirve para controlar que las comisiones se calculan bien. Se puede correr en
cualquier momento, y es la base de la verificación de las fases 1 y 3.

**Necesita la base levantada**, igual que la web. Van dos terminales:

```bash
# terminal 1 — se deja abierta
npm run dev
```

Si el script se corre sin la base, avisa qué falta y no hace nada.

**Cargar**

```bash
# terminal 2
npx tsx scripts/datos-prueba.ts cargar SALTA --escala-prueba
```

`--escala-prueba` **reemplaza** la escala que haya cargada por una completa de c1
a c5. Sin ese flag, usa la que ya está en la base (y si le faltan porcentajes,
esas cuotas liquidan en cero).

El script imprime la cuenta paso a paso. Con la escala de prueba da:

| Vendedor | Detalle | Total |
|---|---|---|
| GOMEZ JUAN | 2 ventas nuevas → tramo 0-2. c1: $200.000 × 20 % = $40.000 · c2: $100.000 × 15 % = $15.000 · c6 descartada (tope c4) | **$55.000** |
| PEREZ ANA | 0 ventas nuevas → tramo 0-2. c3: $400.000 × 10 % = $40.000 · c5: $200.000 × 2 % = $4.000 | **$44.000** |

**Comparar contra la pantalla**

`npm run dev` → entrar como Balta → zona **Salta** → menú **Comisiones**.

Buscar las filas `GOMEZ JUAN (prueba)` y `PEREZ ANA (prueba)`: los totales tienen
que ser exactamente $55.000 y $44.000. Entrando a cada una se ve el desglose por
número de cuota, que también tiene que coincidir renglón por renglón.

Lo que conviene mirar en particular:
- **PEREZ cobra $44.000 con 0 ventas nuevas.** Si diera $0, se rompió la regla de
  que el tramo más bajo también paga las cuotas viejas.
- **A GOMEZ no se le paga la cuota 6.** Su tope es c4. Si el total le diera más de
  $55.000, se está pagando algo que no corresponde.

**Borrar**

```bash
npx tsx scripts/datos-prueba.ts borrar
```

Borra vendedores, clientes, títulos, cuotas y períodos de prueba. **No toca la
escala**: si se usó `--escala-prueba`, hay que volver a cargar la de Balta a mano
desde `/admin/comisiones/escalas`.

---

### Fase 0.6 — Laboratorio: base de desarrollo con datos ficticios

Es el flujo recomendado para trabajar en desarrollo de acá en adelante.

**Una sola vez: generar los archivos**

```bash
npx tsx scripts/generar-padrones-prueba.ts
```

Escribe 7 padrones en `docs/padrones-prueba/`. No van a git: se regeneran con ese
mismo comando.

**Después, todo desde la aplicación** (`npm run dev`, entrar como Balta, zona Salta):

1. Menú **Laboratorio**. Muestra qué hay cargado, separando lo que se borra de lo
   que se conserva.
2. **Vaciar el padrón de SALTA** → pide escribir `SALTA` para confirmar.
   Los contadores de clientes, títulos, cuotas e importaciones quedan en cero.
3. **Crear los vendedores de prueba** → deja `PRUEBA VENDEDOR UNO` (cobra hasta
   c4) y `PRUEBA VENDEDOR DOS` (hasta c5), con sus nombres del padrón ya
   vinculados. Sin esto la importación se planta.
4. **Cargar escala de ejemplo** → dos tramos completos de c1 a c5. Sin esto las
   comisiones dan cero y no se ve nada.
5. **Padrón → Importar padrón**, los 7 archivos **en orden**, del 01 al 07. Cada
   uno se analiza antes de guardar.

**Qué tiene que dar**

En **Comisiones**, mes de agosto de 2026:

| Vendedor | Ventas nuevas | Base | Comisión |
|---|---|---|---|
| PRUEBA VENDEDOR UNO | 2 | $900.000 | **$105.000** |
| PRUEBA VENDEDOR DOS | 0 | $800.000 | **$38.000** |

La cuenta de UNO, para controlarla a mano: c1 $200.000 × 20 % = $40.000 · c2
$200.000 × 15 % = $30.000 · c3 $200.000 × 10 % = $20.000 · c4 $300.000 × 5 % =
$15.000. Sus cuotas 100+ quedan afuera porque cobra hasta c4.

> Todo cae en agosto porque `detectadaPagaAt` se sella al importar, y las
> importaciones se hacen hoy. No es un error: es la regla de devengamiento.

**Qué mirar en cada pantalla**

- **Clientes**: 8 clientes de prueba. `GINA PRUEBA` tiene dos títulos, uno que
  paga y otro que no: es el caso de caída parcial de la Fase 4. `HUGO PRUEBA`
  es el de "sin datos suficientes", también de la Fase 4.
- **Padrón**: las 7 importaciones. De la 2ª en adelante casi todas las cuotas
  figuran como actualizadas, no nuevas: eso es el solape de 3 meses funcionando.
- **Comisiones**: los números de la tabla de arriba.

**Volver a empezar**: repetir desde el paso 2.

---

### Fase 1 — Escalas de comisión por vendedor

Usa el mismo escenario chico y auditable de la Fase 0.5, así que se puede
verificar con la calculadora en la mano.

**Preparación**

```bash
# terminal 1 — se deja abierta
npm run dev
```

```bash
# terminal 2
npx tsx scripts/datos-prueba.ts cargar SALTA --escala-prueba
```

Entrar a http://localhost:3000/login con `balta@crm-csj.local` /
`CambiarEstePassword123`, zona **Salta**.

**1. Confirmar que nada se rompió**

Menú **Comisiones**. Las filas `GOMEZ JUAN (prueba)` y `PEREZ ANA (prueba)`
tienen que dar exactamente lo mismo que en la Fase 0.5: **$55.000** y
**$44.000**. Si alguno cambió, la migración rompió algo.

**2. El listado de escalas** — *esto es lo nuevo*

Menú **Comisiones** → botón **Escalas**. Ya no es un editor: es un listado.
Tiene que verse una sola escala, **General**, con el badge **Predeterminada**
y **"10 tramo(s) · 0 vendedor(es)"**. El 0 es correcto: ni GOMEZ ni PEREZ
tienen esta escala asignada *a mano* aunque los dos cobran con ella (por ser
la predeterminada).

**3. Crear una escala nueva y asignársela a un vendedor**

En el campo de abajo del listado, escribir `Escala baja` y **Crear escala**.
Entra directo a su editor (misma pantalla que antes, ahora por escala). Cargar
un solo tramo: **Desde** `0`, **Hasta** vacío, **c3** `5`, **c5** `1`, el resto
vacío. Guardar.

Ir a **Vendedores** → `PEREZ ANA (prueba)` → **Editar**. En **Escala de
comisión** elegir `Escala baja`. Guardar.

**4. Ver el cambio en la liquidación**

Volver a **Comisiones**:

- `PEREZ ANA (prueba)` ahora tiene que dar **$22.000**: c3 $400.000 × 5 % =
  $20.000, c5 $200.000 × 1 % = $2.000.
- `GOMEZ JUAN (prueba)` sigue en **$55.000**: no se tocó, sigue con la
  predeterminada.

Entrar al **detalle** de PEREZ: el campo **Escala aplicada** tiene que decir
`Escala baja`.

**5. Los candados**

Volver a **Comisiones → Escalas**: `Escala baja` ahora figura con
**1 vendedor**. Intentar eliminar `General` (la predeterminada): tiene que
rechazarlo con *"No se puede eliminar la escala predeterminada."*. Intentar
eliminar `Escala baja` sin antes sacarle el vendedor asignado: tiene que
rechazarlo por tener 1 vendedor asignado.

**Borrar los datos de prueba**

1. En la ficha de PEREZ, volver **Escala de comisión** a la opción
   *Predeterminada* y guardar.
2. En **Comisiones → Escalas**, eliminar `Escala baja` (ya sin vendedores, el
   botón queda habilitado).
3. `npx tsx scripts/datos-prueba.ts borrar` (no toca escalas: por eso el paso 2
   es manual).

---

### Fase 2 — Renovaciones y pestaña Padrón

Esta se prueba con los padrones de prueba, porque **la detección de renovaciones
sólo se ve importando archivos sucesivos**: hace falta que un título no esté en
un padrón y aparezca en el siguiente.

**Preparación**

```bash
# terminal 1 — se deja abierta
npm run dev
```

Si `docs/padrones-prueba/` está vacía, generarlos una vez:

```bash
npx tsx scripts/generar-padrones-prueba.ts
```

Entrar a http://localhost:3000/login con `balta@crm-csj.local` /
`CambiarEstePassword123`, zona **Salta**.

**1. Empezar de cero**

Menú **Laboratorio** → **Vaciar el padrón de SALTA** (pide escribir `SALTA`) →
**Crear los vendedores de prueba** → **Cargar escala de ejemplo**.

**2. El primer padrón es la línea base** — *esto es lo nuevo*

**Padrón → Importar padrón** → `padron-prueba-01-2026-06.xlsx` → **Analizar**.

En el panel de "Qué va a pasar si confirmás" tiene que verse:

- **Títulos nuevos: 6**
- **Ventas nuevas: —** y **Renovaciones: —**, las dos con el texto
  *"sin padrón anterior"*,
- un aviso abajo: **"Es el primer padrón de la zona"**, explicando que sus 6
  títulos quedan como históricos.

Confirmar. Eso es lo correcto y es la parte fácil de equivocar: si el primer
padrón marcara "6 ventas nuevas", el sistema estaría inventando producción que
en realidad tiene años.

**3. El segundo trae ventas nuevas de verdad**

Importar `padron-prueba-02-2026-07.xlsx`. Ahora el panel tiene que decir
**Ventas nuevas: 2** y **Renovaciones: 0**, sin el aviso de línea base. Son
`PT-0001` y `PT-0002`, que entran con cuota 1.

**4. La renovación**

Importar `padron-prueba-03-2026-08.xlsx` (no trae títulos nuevos: 0 y 0) y
después `padron-prueba-04-2026-09.xlsx`.

El cuarto tiene que dar **Ventas nuevas: 0** y **Renovaciones: 1**. Es
`PT-0006`, de FABIO PRUEBA: el club no lo listaba en junio, julio ni agosto, y
en septiembre lo manda con las cuotas 5, 6 y 7. Entra por la 5, así que **no es
una venta del mes**.

**5. Queda registrado** — *esto es lo nuevo*

Ir a **Padrón**. Antes esta pantalla era sólo una lista; ahora arriba está el
panel completo de la **última importación**, con las mismas cifras que se vieron
al analizarla. En la tabla de abajo, la columna **Títulos** muestra el desglose
de cada archivo:

| Archivo | Títulos |
|---|---|
| `padron-prueba-01…` | +6 · línea base |
| `padron-prueba-02…` | +2 · 2 vta · 0 renov |
| `padron-prueba-03…` | +0 · 0 vta · 0 renov |
| `padron-prueba-04…` | +1 · 0 vta · 1 renov |

**6. El origen, título por título**

**Clientes** → `FABIO PRUEBA` → en la tarjeta del título `PT-0006` tiene que
haber un badge **"renovación · entró en la cuota 5"**. Comparar con
`ANA PRUEBA` (`PT-0001`), que dice **"venta nueva · entró en la cuota 1"**, y
con `CARLA PRUEBA` (`PT-0003`), que dice **"ya venía del padrón"**.

**7. La comisión no cambió**

Menú **Comisiones**. Los totales tienen que seguir siendo los mismos que en la
Fase 0.6, porque la renovación no altera el cálculo: no suma al tramo (no trae
cuota 1) y sus cuotas cobran el porcentaje de la cuota real. Si se importan los
7 padrones, PRUEBA VENDEDOR UNO da **$105.000** y DOS, **$38.000**.

**8. Reimportar sigue sin cambiar nada**

Volver a importar `padron-prueba-04-2026-09.xlsx`. Tiene que avisar
**"Este padrón no trae novedades"**, con títulos nuevos en 0 y todas sus cuotas
en "ya cargadas". El origen de `PT-0006` no se recalcula: sigue siendo
renovación.

**Borrar los datos de prueba**

Desde **Laboratorio** → **Vaciar el padrón de SALTA**. Los vendedores de prueba
quedan (no molestan); si se quieren sacar, se dan de baja desde
`/admin/vendedores`.

### Fase 3 — Comisión del agente

**Preparación**

La base de desarrollo ya quedó con este escenario cargado. Si hiciera falta
rearmarlo: `npm run dev`, entrar como `balta@crm-csj.local` /
`CambiarEstePassword123` en zona **Salta**, y desde **Laboratorio** → **Vaciar
el padrón de SALTA** → **Crear los vendedores de prueba** → **Cargar escala de
ejemplo**, y después importar los 7 padrones de `docs/padrones-prueba/` en
orden desde **Padrón → Importar padrón**.

**1. Abrir la pantalla nueva**

**Comisiones** → botón **Comisión del agente** (o directo
`/admin/comisiones/agente`). Arriba tiene que verse:

| Tarjeta | Valor |
|---|---|
| Comisión del club | **$564.000** |
| Cuotas cobradas | **54** |
| Se le paga al equipo | **$143.000** |
| Margen de la agencia | **$421.000** |

**2. La cuenta, renglón por renglón**

La tabla "Cómo se llega al total" tiene que dar exactamente esto:

| Tramo | Cuotas | Base | % | Comisión |
|---|---|---|---|---|
| c1 a c2 | 4 | $400.000 | 25 % | $100.000 |
| c3 a c4 | 7 | $900.000 | 20 % | $180.000 |
| c5 | 5 | $700.000 | 10 % | $70.000 |
| c6 a c60 | 29 | $4.900.000 | 4 % | $196.000 |
| c61 en adelante | 9 | $900.000 | 2 % | $18.000 |

Suma: **$564.000** sobre **$7.800.000** cobrados. Se puede verificar con la
calculadora: cada renglón es la base por su porcentaje.

**Lo importante de este cuadro**: 38 de las 54 cuotas están arriba de la c5.
Esas son las que el vendedor **no** cobra y el agente **sí**: son $214.000 de
los $564.000. Hasta esta fase el sistema no las contaba en ningún lado.

**3. El detalle por número de cuota**

Abajo de todo, la tabla "Detalle por número de cuota" muestra cuánto se cobró de
cada cuota puntual. Es de dónde sale la base de cada tramo: sumando las cuotas
c6 a c60 de esa tabla tiene que dar los $4.900.000 del renglón.

**4. Los contratos del mes y el objetivo**

En la tarjeta derecha: **2 ventas nuevas**, **1 renovación**, **3 de 100**, con
el cartel **"Por debajo del objetivo"** y un aviso arriba explicándolo. Los 3
son `PT-0001`, `PT-0002` (ventas nuevas) y `PT-0006` (la renovación de la Fase
2): la renovación cuenta para el objetivo aunque no sea una venta.

Los 5 títulos `BASE` no cuentan: ya venían de antes del sistema.

**5. Cambiar el contrato mueve el número**

**Contrato** (arriba a la derecha) → cambiar el **2** del tramo `61 en adelante`
por **5** → **Guardar**. Volver: el último renglón pasa de $18.000 a $45.000 y
el total a **$591.000**.

Antes de seguir hay que dejarlo como estaba (2), o usar **Laboratorio →
Restaurar el contrato de agencia**; si no, los números de los pasos que siguen
no van a coincidir.

**6. El objetivo es por zona**

En la misma pantalla del contrato, **Objetivo del mes** dice **100** en Salta.
Cambiando de zona a Tucumán (menú de arriba) tiene que decir **50**. Es
editable.

**7. Los gastos de representación NO suman a la comisión**

En la liquidación, el campo **Gastos de representación** al pie de la tabla:
escribir **215000** y salir del campo. Tiene que pasar esto:

- la tarjeta **Comisión del club** sigue en **$564.000** (no se movió),
- el **Balance del mes** al pie pasa a **$636.000** ($564.000 + $215.000 −
  $143.000),
- la tarjeta **Margen de la agencia** sigue en **$421.000**.

Es lo que pediste: el reintegro se ve, pero no se mezcla con la comisión.

**8. Cerrar congela**

**Cerrar el período** → confirma con el total. Queda el badge **Cerrado**, el
campo de gastos deshabilitado y el botón cambia a **Reabrir**. Para comprobar
que quedó congelado: ir al **Contrato**, cambiar un porcentaje, volver — el
total **no** se mueve. **Reabrir** y el número se recalcula con el porcentaje
nuevo.

**9. El dashboard**

**Dashboard**: dos tarjetas nuevas, **Comisión del club** ($564.000) y **Margen
de la agencia** ($421.000), las dos linkeadas a la pantalla del agente.

**10. Ojo con el aviso de línea base**

Arriba de la liquidación hay un cartel gris: *"Este mes incluye la primera
importación de la zona"*. Es correcto que aparezca en esta prueba —los 7
padrones se importaron el mismo día— y avisa que ese total está inflado. En
producción sólo va a salir el primer mes.

**Borrar los datos de prueba**

**Laboratorio** → **Vaciar el padrón de SALTA**. Los períodos de comisión del
agente que hayan quedado cerrados no se borran con eso; si molestan, se reabren
desde la pantalla.

### Fase 4 — Caídas de clientes

Igual que la Fase 2, se prueba con los padrones de prueba: **una caída sólo se
ve importando archivos sucesivos**, porque hacen falta 6 cuotas consecutivas de
histórico y cada padrón trae 3 meses.

**Preparación**

La base de desarrollo ya quedó con el escenario cargado y las caídas
calculadas. Si hiciera falta rearmarlo, primero regenerar los archivos —el
escenario cambió en esta fase—:

```bash
npx tsx scripts/generar-padrones-prueba.ts
```

y después, con `npm run dev` levantado y entrando como `balta@crm-csj.local` /
`CambiarEstePassword123` en zona **Salta**: **Laboratorio** → **Vaciar el padrón
de SALTA** → **Crear los vendedores de prueba** → **Cargar escala de ejemplo**,
e importar los 7 padrones en orden desde **Padrón → Importar padrón**.

**1. Los filtros nuevos** — *esto es lo nuevo*

Menú **Clientes**. Arriba del listado hay una fila de botones con contadores:

| Filtro | Tiene que decir |
|---|---|
| Caída total | **0** |
| Caída parcial | **1** |
| En riesgo | **1** |
| Sin datos suficientes | **1** |

Y en la tabla, una columna **Estado** nueva: `GINA PRUEBA` con el badge
**caída parcial**, `HUGO PRUEBA` con **en riesgo**, y el resto en "al día".

**2. La caída parcial**

Apretar **Caída parcial**: queda sola `GINA PRUEBA`. Entrar a su ficha. Tiene
dos títulos:

- **`PT-0007`** con el badge rojo **"caído · 9 impagas seguidas"**, "Última
  cuota paga: ninguna que hayamos visto", "Histórico conocido: cuotas 4 a 12" y
  la fecha de caída.
- **`PT-0008`**, el otro título de la misma clienta, sin ningún badge de caída.

Eso es lo que hace que sea **parcial** y no total: se le cayó un plan, no los
dos. Si tuviera los dos caídos, el filtro **Caída total** la traería a ella.

**3. Lo importante: el título que el sistema NO puede juzgar** — *esto es lo
nuevo*

Apretar **Sin datos suficientes**: queda `HUGO PRUEBA`. En su ficha, el título
`PT-0009` tiene el badge gris **"sin datos suficientes"** y abajo un recuadro
que explica por qué.

La cuenta, para verla con los ojos: en la tabla de cuotas de ese título están
las cuotas **16, 17, 18** y después **22, 23, 24**. Las seis figuran impagas. Si
el sistema contara "seis impagas seguidas" lo daría por caído — pero **las
cuotas 19, 20 y 21 nunca se importaron**, y pudieron estar pagas. Así que corta
la racha en 3 y dice que no sabe.

Es el error que hay que evitar: dar por caído a alguien que viene pagando.

**4. El riesgo**

`HUGO PRUEBA` también aparece en **En riesgo**, con 3 impagas seguidas de las 6
que hacen falta. Son dos cosas distintas y conviven: *"se está yendo"* y *"no
tengo el historial completo"*.

**5. Se recalcula sola al importar**

**Padrón → Importar padrón** → volver a subir `padron-prueba-07-2026-12.xlsx`.
Al confirmar, además del panel de siempre tiene que aparecer un aviso: **"1
título de este padrón está caído"**. Y en **Clientes** los contadores quedan
exactamente iguales que antes: reimportar no cambia nada.

**6. La caída no toca la plata**

**Comisiones**: `PRUEBA VENDEDOR UNO` sigue en **$105.000** y `DOS` en
**$38.000**. **Comisiones → Comisión del agente**: sigue en **$564.000** sobre
54 cuotas. La caída es información, no un contracargo — como lo definiste.

**7. La primera pasada, para títulos que ya estaban cargados**

**Laboratorio** → botón **Recalcular las caídas**. Tiene que responder
*"9 títulos revisados: 1 caídos, 1 sin datos suficientes"*, y los números de
**Clientes** no se mueven. Es el mismo trabajo que hace
`npx tsx scripts/recalcular-caidas.ts` desde una terminal; sirve una sola vez,
sobre títulos importados antes de esta fase.

**8. Qué se ve con un padrón solo**

Vale la pena tenerlo presente para cuando esto corra con datos reales: con un
único padrón cargado **ningún título puede figurar caído**, porque trae 3 meses
y hacen falta 6. Se comprobó contra el padrón real: 2.334 títulos, 0 caídos y
436 sin datos suficientes. El sistema lo dice; no muestra "no hay caídas".

**Borrar los datos de prueba**

**Laboratorio** → **Vaciar el padrón de SALTA**.

### Fase 5 — Gráficos del dashboard

**Preparación**

La base ya quedó con todo cargado. Si hiciera falta rearmarlo: los 7 padrones de
prueba importados en Salta (ver la guía de la Fase 2) y, para que la torta tenga
datos, **Laboratorio → Cerrar meses de ejemplo**.

Ese botón hace falta porque un mes cerrado es el resultado de haber liquidado
ese mes, y en la base de desarrollo se importó todo el mismo día: no hay forma de
fabricar meses anteriores desde la pantalla.

**1. El dashboard quedó con 6 tarjetas** — *esto es lo nuevo*

Menú **Dashboard**. Arriba tienen que quedar exactamente estas seis:

| Tarjeta |
|---|
| Cobranza acumulada |
| Promedio de cuota |
| Ventas del mes |
| Comisiones del mes |
| Comisión del club |
| Margen de la agencia |

Ya **no** están *Leads sin asignar* ni *Clientes en padrón*. Los leads se siguen
viendo en su propia pantalla y los clientes en la suya; lo que se sacó es la
tarjeta del dashboard.

**2. La torta de comisiones** — *esto es lo nuevo*

Abajo a la izquierda, **Comisión del club por mes**. Con los meses de ejemplo
cargados tiene que dar exactamente esto, y se puede controlar con la
calculadora:

| Mes | Importe | Parte |
|---|---|---|
| Marzo de 2026 | $ 300.000 | 10 % |
| Abril de 2026 | $ 450.000 | 15 % |
| Mayo de 2026 | $ 600.000 | 20 % |
| Junio de 2026 | $ 750.000 | 25 % |
| Julio de 2026 | $ 900.000 | 30 % |

En el centro de la torta, el total: **$ 3.000.000**. Los porcentajes suman 100.

El color va del verde más claro (marzo, el más viejo) al más oscuro (julio, el
más nuevo): la rampa muestra el orden de los meses.

**3. Lo que la torta NO muestra**

La tarjeta **Comisión del club** de arriba dice **$ 564.000** —agosto, el mes en
curso— y ese número **no** está en la torta ni en el total de $ 3.000.000. Es a
propósito y está escrito en la tarjeta: agosto está en borrador y se sigue
moviendo con cada padrón que entre, así que mostrarlo lo dejaría más chico de lo
que va a terminar siendo.

Para comprobarlo: **Comisiones → Comisión del agente**, cerrar agosto, volver al
dashboard. Ahora la torta tiene seis gajos y el total pasa a **$ 3.564.000**.
Conviene reabrirlo después para no dejar el mes cerrado.

**4. Las barras de producción** — *esto es lo nuevo*

Abajo a la derecha, **Títulos nuevos en los últimos 5 padrones**. Con los 7
padrones importados, la ventana cae sobre los últimos cinco (agosto a diciembre)
y tiene que verse: una sola barra azul de **1** en septiembre —la renovación
`PT-0006` de la Fase 2— y el resto en cero.

Está bien que esté casi vacío: en el escenario de prueba sólo hubo movimiento en
julio y septiembre. Que un padrón no traiga títulos nuevos es información, no un
error.

**5. Las tres formas de la barra**

Para verlas todas juntas hay que mirar el dashboard **cuando van importados
cinco padrones**, que es cuando la ventana cubre del 01 al 05. Desde
**Laboratorio** → **Vaciar el padrón de SALTA** → **Crear los vendedores de
prueba** → **Cargar escala de ejemplo**, importar del 01 al 05 y abrir el
dashboard:

- **junio**: barra **gris** de 6 con la etiqueta *base*. Es el primer padrón de
  la zona: no hay con qué comparar, así que no se sabe cuáles títulos eran
  ventas. Es el punto importante del gráfico — pintarla en cero estaría diciendo
  que ese mes no se vendió nada.
- **julio**: barra **roja** de 2. Ventas nuevas.
- **septiembre**: barra **azul** de 1. Una renovación.
- agosto: en cero.

Después se importan el 06 y el 07 para dejar la base como estaba.

**6. Rojo y azul, no rojo y verde**

Vale la pena saber por qué: rojo y verde era lo natural para "ventas nuevas" y
"renovaciones", y el chequeo de daltonismo lo rechazó —para una persona con
deuteranopia son el mismo color—. Por eso las renovaciones van en azul.

**Borrar los datos de prueba**

Los meses de ejemplo son períodos de comisión cerrados. Se sacan desde
**Comisiones → Comisión del agente**, navegando a cada mes y apretando
**Reabrir**; o se vuelven a pisar apretando otra vez **Cerrar meses de ejemplo**.

### Fase 6 — Formulario de venta

**Preparación**

No hace falta cargar nada: alcanza con `npm run dev` y entrar como
`balta@crm-csj.local` / `CambiarEstePassword123`, zona **Salta**. Los planes ya
están cargados desde la pestaña Planes.

**1. Los campos nuevos** — *esto es lo nuevo*

**Ventas** → **Cargar venta**. De arriba abajo tiene que verse exactamente este
orden:

| Tarjeta | Campos |
|---|---|
| Vendedor | Vendedor \* |
| Plan y suscripción | Plan \* · Nro Suscripción |
| Datos del cliente | D.N.I \* · Nombre y Apellido \* · Calle Nro y Barrio \* · Teléfono \* |
| Título y observación | Título · Observación |
| Documentación | Foto del DNI · Contrato |

Ya no están *Localidad*, *Provincia* ni *Adhiere a débito automático*.

**2. El desplegable de planes** — *esto es lo nuevo*

Abrir **Plan**: las opciones muestran **sólo el nombre** (`Plan Auto 330`,
`Plan Moto 120`…), sin el código ni el precio. Salen de la pestaña **Planes**:
si cargás uno nuevo ahí, aparece acá.

Al elegir uno, debajo aparece un renglón gris con **la cuota y el código**, y
aclara *"sólo como referencia, no se guarda"*. Es el recordatorio que pediste
para el vendedor.

**3. La regla del número de suscripción** — *esto es lo nuevo*

Con el formulario recién abierto, **Nro Suscripción** tiene asterisco. Escribí
algo en **Título** (abajo): el asterisco de Nro Suscripción **desaparece** y el
texto de ayuda pasa a decir *"Opcional: ya cargaste el título"*. Borrá el
título y vuelve.

Para ver que no es sólo la pantalla: completá todo **menos** los dos, y apretá
**Cargar venta**. Tiene que rechazarlo con *"Cargá el número de suscripción, o
el título si el club ya lo asignó."*

**4. La regla de la observación** — *esto es lo nuevo*

Escribí algo en **Nro Suscripción**: **Observación** pasa a tener asterisco y
avisa *"Obligatoria mientras la venta no tenga título"*. Si intentás guardar sin
completarla, lo rechaza.

> Ojo con esto: como la suscripción es obligatoria hasta que llegue el título,
> en la práctica **la observación va a ser obligatoria en casi toda venta
> nueva**. Está hecho tal cual lo definiste; si no era la idea, avisame.

**5. Una venta que sí se guarda**

Completá: Vendedor, Plan, **D.N.I** `99999999`, Nombre `PRUEBA FASE SEIS`,
Calle `Calle Falsa 123, Barrio Centro`, Teléfono `0387 415-1234`, Título
`998877`. Dejá Nro Suscripción y Observación vacíos. **Cargar venta** → guarda y
vuelve al listado.

**6. El teléfono no pierde el cero**

Entrá a la venta (desde la cuenta del vendedor que la cargó, que es donde vive
la ficha). El teléfono tiene que decir **03874151234**: se guardó con el cero de
adelante y sin el paréntesis ni el guion. Si se hubiera guardado como número,
diría `3874151234`, que es otro teléfono.

En la misma ficha: **Calle Nro y Barrio**, **Nro Suscripción** en `—`, **Título**
`998877`, y **Título en el padrón** *"todavía no apareció"* — son dos cosas
distintas: uno lo anota el vendedor, el otro lo encuentra el sistema al importar.

**7. La foto del DNI es opcional** — *esto es lo nuevo*

En el paso 5 no adjuntaste nada y la venta se cargó igual. En la ficha, la
tarjeta **Documentación** muestra **"sin foto del DNI todavía"** en ámbar: es un
pendiente, no un error. Se sube después con **Editar**.

**Borrar los datos de prueba**

La venta quedó con DNI `99999999`. Se anula o se borra desde el listado de
ventas; si quedaron varias, pedime que las borre por script.

---

## Contexto para la próxima sesión

**Dónde retomar:** Lisandro validó la Fase 5 el 27/08/2026. La Fase 6
(formulario de venta) está construida y verificada contra la aplicación
levantada; falta que la valide siguiendo la guía de arriba. **Con eso el plan
queda terminado.**

Lo que queda abierto después de la Fase 6:

- **Confirmar con Balta que la observación sea obligatoria en casi toda venta
  nueva**, que es la consecuencia de las dos reglas como las definió (ver la
  Fase 6). Si no era la idea, se cambia en una línea.
- **Decidir qué pasa con el prototipo** `app/admin/prototipo-formulario-venta/`:
  borrarlo, o convertirlo en algo real si Balta quiere poder cambiar los campos
  solo. Lo segundo es una fase aparte bastante más grande.

**Cosas que conviene saber:**

- **La base de desarrollo tiene los 7 padrones de prueba importados** en Salta,
  con los orígenes ya resueltos (`PT-0006` es la renovación), las caídas
  calculadas (`PT-0007` caído, `PT-0009` sin datos suficientes) y sin ningún
  período de comisión del agente guardado. Para empezar de cero, vaciar desde
  `/admin/laboratorio`.
- **El prototipo del formulario no guarda nada.** Es `useState` puro, sin
  `localStorage` ni backend: lo que se configura vive en la pestaña abierta y se
  pierde al recargar (y un hot-reload lo borra). Si hace falta volver a definir
  campos con Balta, conviene primero agregarle persistencia o pedirle una
  captura antes de tocar el archivo.
- **La ficha de una venta es sólo para vendedores** (`/vendedor/ventas/[id]`);
  desde `/admin` se ve el listado pero no la ficha. Para revisarla como admin
  hay que crear una cuenta de vendedor y engancharla a la ficha del vendedor
  dueño de la venta.
- **`prisma generate` no le llega al `next dev` que ya está corriendo.**
  `lib/db.ts` guarda el cliente en `globalThis` para sobrevivir al hot-reload,
  así que después de una migración hay que reiniciar el servidor o levantar uno
  aparte (`npx next start -p 3010` sobre el build, que es lo que se hizo en la
  Fase 6). El síntoma es un `PrismaClientValidationError: Unknown argument`
  sobre una columna que sí existe en la base.
- **Los colores de los gráficos se validan, no se eligen a ojo.** La Fase 5 dejó
  la regla asentada en `CLAUDE.md`: rojo (`--chart-1`) y verde (`--chart-2`) no
  se pueden usar juntos en un mismo gráfico porque bajo deuteranopia son
  indistinguibles. El par que sí pasa es `--chart-1` con `--chart-4`.
- **Los gráficos no usan Recharts.** Está en `package.json` pero no lo importa
  nadie: los tres gráficos del dashboard son SVG y divs renderizados en el
  servidor. Si alguna vez hace falta interacción de verdad, ahí sí conviene
  evaluarla; mientras tanto, sumarla obligaría a volver componentes de cliente
  pantallas que hoy no lo son.
- **La base de desarrollo tiene 5 meses de comisión del agente cerrados** en
  Salta (marzo a julio de 2026, $3.000.000 en total), sembrados desde
  **Laboratorio → Cerrar meses de ejemplo** para poder ver la torta. No salen de
  ningún cálculo: son importes de ejemplo elegidos para que las partes den 10,
  15, 20, 25 y 30 %.
- **El modo oscuro no tiene interruptor.** Los tokens `.dark` existen y los
  gráficos están validados contra el fondo oscuro, pero ninguna pantalla pone la
  clase, así que hoy no se puede llegar desde la aplicación.

- **El escenario de prueba tiene 9 títulos y 8 clientes desde la Fase 4.** Si se
  regeneran los padrones con una copia vieja del script, `PT-0009` no va a estar
  y la guía de la Fase 4 no va a coincidir.
- **La escala del contrato de agencia ya está cargada en las dos zonas**: la
  sembró la migración `20260827015729_comision_agente`, junto con el objetivo
  mensual (Salta 100, Tucumán 50). Si se estuvo probando con otros porcentajes,
  **Laboratorio → Restaurar el contrato de agencia** la deja como el contrato
  real.
- **Correr `scripts/verificar-padron.ts` mete el padrón real en la base de
  desarrollo**, con nombre, DNI y domicilio de miles de clientes reales. Es el
  chequeo obligatorio de cualquier fase que toque la importación, pero después
  hay que vaciar la zona y recargar los padrones de prueba, como se hizo en la
  Fase 2.

- **`scripts/verificar-padron.ts` deja vendedores con nombres reales** en la base
  de desarrollo: crea uno de relleno por cada `NomVen` del archivo, con código
  `P000`, `P001`… Vaciar el padrón borra clientes, títulos y cuotas, pero **nunca
  vendedores**, así que hay que borrarlos aparte. En la Fase 4 se sacaron los 36
  que habían quedado; si se vuelve a correr el script, hay que repetirlo.

- **La ficha de vendedor de Balta y Pedro todavía no existe con datos reales.**
  Hasta que se cree y se enlace, `getVendedorDelAdmin()` devuelve null y la
  tarjeta "Mi comisión del mes" no aparece. Falta el DNI y el código reales
  (ver pendientes).
- **`prisma dev` deja un lock huérfano si se lo mata a la fuerza.** Si la base no
  arranca con `Lock file is already being held`, está documentado en
  `CLAUDE.md`. No hay que borrar datos, sólo un directorio.
- **El pool contra la base local está limitado a 4** en `lib/db.ts`, porque
  `prisma dev` corta a las ~9 conexiones. Desde la Fase 4 el corte mira el host y
  no `NODE_ENV`, así que también aplica a los scripts de `scripts/`, que corren
  sin esa variable. Para verificar en producción-local, igual conviene
  `npm run dev` y no `npm start`.
- **`prisma dev` se puede colgar sin caerse.** Pasó en la Fase 4: el proceso
  seguía escuchando en el 51218 pero cerraba toda conexión (`P1017
  ConnectionClosed`, y `ECONNRESET` con `pg` directo). Se arregla con
  `npx prisma dev stop crm-csj` y `npx prisma dev --name crm-csj --detach`; es un
  cierre limpio, no deja el lock huérfano y no toca los datos. Ojo que eso
  también tumba el `npm run dev` que lo tenga adentro.
- **La escala predeterminada de la base local ("General") es de ejemplo**,
  cargada desde el laboratorio: dos tramos completos de c1 a c5. Los
  porcentajes reales los tiene que cargar Balta. Desde la Fase 1 puede haber
  más escalas además de esta: se administran en `/admin/comisiones/escalas`.
- **Para verificar cálculos hay dos caminos.** `scripts/datos-prueba.ts` escribe
  directo en la base e imprime la cuenta esperada (rápido, sin importación).
  `/admin/laboratorio` + los padrones de prueba pasan por la importación real
  (más lento, pero es lo que hay que usar para las fases 2 y 4).
- **La base de desarrollo ya no tiene el padrón real.** Se vació Salta y se
  cargaron los 7 padrones de prueba. Si hiciera falta volver a los datos reales,
  está `docs/Padron-siscaho-tucu-167-010626.xls`; los otros tres que se habían
  importado no están en el repositorio.
- Los archivos sin trackear `app/admin/prototipo-formulario-venta/` y
  `docs/cambios 24-8.txt` son de Lisandro y de la Fase 6: no commitearlos sin
  preguntar.

---

## Pendientes de Balta

Ninguno bloquea el avance, salvo el último.

1. **DNI y código de vendedor de Balta y Pedro**, para crear sus fichas reales.
   Mientras tanto se usan datos ficticios marcados.
2. **Qué es "el esquema anterior"** al que vuelve el contrato si no se llega al
   objetivo de contratos del mes. Por ahora la Fase 3 sólo avisa y liquida con
   la escala completa igual.
3. **Campos finales del formulario de venta** — bloquea la Fase 6.
4. En el padrón, Pedro aparece bajo tres alias (`TOLEDO PEDRO`, `TOLEDO PEDRO A.`,
   `TOLEDO PEDRO ANTONIO`). Con la Fase 0 hecha, esos títulos se le pueden
   imputar a su ficha de agente. Confirmar que corresponde.

Respondidos el 27/08/2026 (ver [Definiciones confirmadas](#definiciones-confirmadas-por-balta)):
el contrato de agencia es el mismo para Balta y para Pedro; la comisión del
agente se calcula por zona y no se reparte entre ellos; los gastos de
representación se cargan a mano y van aparte de la comisión; el objetivo de
contratos es 50 en Tucumán y 100 en Salta, y las renovaciones cuentan.
