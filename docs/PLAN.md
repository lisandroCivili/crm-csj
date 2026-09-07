# Plan de trabajo — cambios acordados con Balta (24/08/2026)

Documento vivo. Sale de `docs/cambios 24-8.txt` (las anotaciones de Lisandro) más
las respuestas de Balta y la adenda del contrato de agencia.

> **Segunda tanda (27/08/2026).** Las fases 7 a 12 salen de una lista nueva de
> Lisandro, escrita después de usar el sistema: actividad que sólo muestra leads,
> padrón de a un archivo, clientes que no se pueden corregir, un toast que miente,
> ventas sin confirmación ni edición desde admin, planes que no se editan, y el CRM
> roto cuando se entra desde el celular por ngrok.

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
| 6 | Formulario de venta | ✅ commit `4bd1ab9` |
| 7 | Que el CRM funcione desde el celular | ✅ commit `84db215` |
| 8 | Tres arreglos chicos (toast · editar plan · código de agente) | ✅ commit `24e8013` |
| 9 | Padrón: varios archivos y selector nuevo | ✅ commit `96f7c45` |
| 10 | Clientes: corregir datos y ver la documentación | ✅ commit `351e633` |
| 11 | Ventas: confirmar, editar desde admin, foto con la cámara | ✅ commit `aa06212` |
| 12 | Actividad: leads + ventas, filtrable por vendedor | ✅ commit `3c24fc1` |
| 13 | QA: los agujeros de zona (alias · títulos · `leadId` · links rotos) | ✅ commit `3dbfd89` |
| 14 | QA: la red (escenario de dos zonas · tests de parsers · guion de permisos) | ✅ commit `ab8dccc` |
| 15 | QA: el recorrido humano (dos zonas, dos cuentas, los dos roles) | ✅ commit `f5f2faa` |
| 16 | Vendedor: mi cartera (títulos, cuotas, caídas) | ✅ commit `00dd9b2` |
| 17 | Vendedor: mi comisión (histórico y de dónde sale cada peso) | 🔨 commit `PENDIENTE` |
| 18 | Vendedor: listados a escala (buscar, filtrar, paginar) | ⬜ |

Dependencias:

```
Fase 0  Balta/Pedro vendedores ──┬──> Fase 3  Comisión del agente ──┬──> Fase 5  Gráficos
Fase 1  Escalas por vendedor ────┘                                  │
Fase 2  Renovaciones + padrón ──────────────────────────────────────┘
Fase 4  Caídas          (independiente, necesita padrones cargados)
Fase 6  Formulario      (bloqueada por definición de Balta)

Fase 7  Móvil    ──> habilita probar todas las demás desde el celular
Fase 8  Chicos       (independiente, hecha)
Fase 9  Padrón       (independiente, hecha)
Fase 10 Clientes ──┐
Fase 11 Ventas   ──┴──> Fase 12  Actividad

Fase 13 Arreglos ──> 13.1 desbloquea importar el padrón de Tucumán
                        │
Fase 14 La red   ───────┴──> 14.1 siembra las dos zonas ──> 14.3 la verifica
                        │
Fase 15 Recorrido ──────┘

Fase 16 Mi cartera ──> Fase 17 Mi comision (cada titulo linkea a su ficha)
Fase 18 Listados a escala   (independiente)
```

**El orden de las fases 7 a 12 no es el del pedido, y es a propósito.** La 7 va
primera porque hasta que el CRM no funcione desde el celular no se puede validar
nada desde el celular. La Actividad —que Lisandro pidió primero— va última porque
tiene que registrar cosas que todavía no existen (anulación de venta, edición de
cliente, edición desde admin); hacerla antes obligaría a volver a tocarla.

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

### Definiciones de la segunda tanda (Lisandro, 27/08/2026)

Las que hacían falta para poder planificar las fases 7 a 12.

| Tema | Definición |
|---|---|
| Cliente corregido a mano vs. padrón | **Manda el dato corregido.** El campo editado queda marcado y el padrón deja de tocarlo. Sin esto, corregir un teléfono no sirve para nada: la próxima importación lo pisa. |
| Qué registra la Actividad | Los leads que ya registra, **más alta, edición y anulación de venta**, **más la edición de datos del cliente**. |
| Edición de venta | El vendedor **conserva todas** las opciones que ya tiene, y el admin recibe **las mismas**. No se acota nada: se agrega la puerta que falta. |
| Logo del sidebar | Lo aporta Lisandro como archivo en `public/`. |

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

### ✅ Fase 6 — Formulario de venta

Commit `4bd1ab9`. Validada por Lisandro el 28/08/2026. Migración
`20260827173116_campos_formulario_venta`. Los campos los definió Balta
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

### ✅ Fase 7 — Que el CRM funcione desde el celular

Commit `84db215`. Sin migración. Validada por Lisandro el 28/08/2026. Bloquea a las demás: sin esto no se puede validar ninguna fase desde el teléfono,
y el sistema se usa mucho desde el teléfono.

#### 7.1 Los botones muertos por ngrok

**Se reprodujo sin el celular y sin ngrok**, que era lo que hacía falta para no
arreglar a ciegas: se levantó un proxy HTTPS local que hace de túnel —termina el
TLS afuera, manda `Host: prueba.ngrok-free.app` y las cabeceras `X-Forwarded-*`
que pone ngrok— y se entró con Playwright en viewport de iPhone, resolviendo ese
dominio contra `127.0.0.1`. El resultado fue exactamente el síntoma que contó
Lisandro, y con la causa a la vista.

**La causa: `next dev` devuelve 403 a los `/_next/static/chunks/*.js` que pide
cualquier host que no sea localhost.** Lo hace `blockCrossSiteDEV`, que protege
los recursos de desarrollo y cuya lista de permitidos es
`['**.localhost', 'localhost', hostname]`. Cayeron dos chunks, y uno era el de
`node_modules` —el que trae React y Radix—, así que **la página nunca hidrata**.

Por qué se ve como se ve: el HTML lo arma el servidor, así que la pantalla se
dibuja entera y los links navegan igual (son `<a>`). Lo único que muere es lo que
necesita JavaScript, que en el header son justo dos cosas: el hamburguesa y el
desplegable de perfil. No hay ningún error en pantalla que lo explique.

El arreglo es `allowedDevOrigins` en `next.config.ts`, con los dominios de ngrok
y una variable `ORIGENES_DEV` para agregar lo que haga falta —la IP de la máquina
en la red de casa, otro túnel— sin tocar código.

Va además `experimental.serverActions.allowedOrigins`, **sólo en desarrollo**.
Las server actions comparan el `Origin` contra el `Host`, y si el túnel reescribe
el Host (`ngrok --host-header=rewrite`) dejan de coincidir y muere toda acción:
login, cargar venta, importar padrón. En producción no hay ningún túnel, y esa
lista relaja la protección CSRF: dejarla puesta sería abrirle la puerta a
cualquier `*.ngrok-free.app`.

#### 7.2 El menú que navegaba sin cerrarse

Segundo bug, independiente del anterior y encontrado al probar el primero: **el
panel del celular no se cerraba al tocar un link**. Se navegaba a la pantalla
nueva con el menú tapándola, y para salir había que tocar afuera.

El componente decía en un comentario que el panel "se cierra solo porque los
links van envueltos en `SheetClose`". No era cierto y no lo fue nunca:
`next/link` llama a `preventDefault()` para navegar del lado del cliente, y Radix
compone sus handlers con `checkForDefaultPrevented`, así que cuando el evento
llega al `Close` ya viene con `defaultPrevented` y el cierre **se saltea**.

`MenuMovil` pasa a ser componente cliente con su propio `abierto` y cierra en el
click. Cerrar en el click y no al cambiar de ruta es a propósito: cubre el caso
de tocar el link de la pantalla en la que ya se está parado, donde `usePathname`
no cambia. Y `SheetClose` **deja de exportarse** desde `components/ui/sheet.tsx`,
con la trampa anotada ahí mismo para que nadie la vuelva a pisar.

Se agregó también un `export const viewport` explícito en `app/layout.tsx`. Next
inyecta el mismo por defecto; conviene que esté escrito. Sin `maximumScale` ni
`userScalable`: apagar el zoom es cómodo para el que diseña y un problema para el
que necesita agrandar la letra.

#### 7.3 Desplazamiento horizontal

Primero medir. `scripts/capturas.mjs` recorre las diez pantallas de admin en
viewport de iPhone 14; ahora además compara `scrollWidth` contra `clientWidth` y
**nombra al elemento que se sale**, con su etiqueta, sus clases y hasta qué píxel
llega. Ignora lo que vive dentro de un contenedor que scrollea solo: una tabla
ancha metida en un `overflow-x: auto` está bien resuelta, no es un desborde.

Culpable único, y no era el que se sospechaba: **`/admin/comisiones`**, con 68px
de más sobre un viewport de 390. El sospechoso anotado al planificar —el
`grid grid-cols-2` del dashboard— no desborda.

El desborde salía de `components/layout/page-header.tsx`, que es de todas las
pantallas: el bloque de acciones era `flex shrink-0 gap-2` y en Comisiones son
tres botones que suman 458px. Con `shrink-0` la caja no cedía y corría la página
entera. Pasa a `flex flex-wrap gap-2`: los botones bajan de renglón en vez de
empujar. Se arregla ahí y no en Comisiones porque el problema es del molde.

Red de contención en `app/globals.css`:

```css
html, body { overflow-x: clip; }
```

**`clip` y no `hidden`**: `overflow-x: hidden` en html/body crea un contenedor de
scroll y el header sticky de `app-shell` deja de pegarse arriba. Verificado
scrolleando 600px en dos pantallas: el header se queda en `top: 0`.

La red taparía el problema siguiente y dejaría el chequeo ciego, así que **el
chequeo la apaga antes de medir** y la vuelve a poner. La red es para que un
descuido no rompa el teléfono, no para no enterarse.

#### 7.4 El logo de la barra lateral

El archivo que pasó Lisandro venía de 1024×1024 con la marca ocupando el 10% del
lienzo y por encima del centro: a 40px se habría visto minúscula y torcida. Se
recortó al cuadrado de la marca (413×413) y se llevó a blanco puro el ruido de
compresión del fondo, que venía en 252-254 y se notaba contra el recuadro.

`Marca` reemplaza el monograma "CSJ" por el archivo con `next/image`, dentro del
mismo recuadro redondeado que había. El `alt` va vacío a propósito: el nombre
está escrito al lado y un lector de pantalla lo diría dos veces.

#### 7.5 El texto de la marca

El logo dice *Agencia Mercantil* y al lado seguía diciendo *Club San Jorge*, que
era lo que había antes. Lisandro lo resolvió el 28/08/2026 sin tocar el nombre:
la que cambia es **la bajada**, que decía *Administración* y ahora dice **Agente
Mercantil**.

Es un cambio de una línea en `components/layout/app-shell.tsx` y arregla algo que
estaba mal planteado de antes: esa línea describe a quién tiene la sesión —abajo
dice *Vendedor* cuando entra un vendedor—, y *Administración* nombraba a una
sección del software en vez de a la persona. Balta y Pedro son agentes
mercantiles del club, que es justamente el título que trae el logo.

El badge de rol de `/perfil` sigue diciendo *Administración*: ahí sí se está
nombrando el rol de la cuenta dentro del sistema, no a la persona.

**Archivos**: `next.config.ts`, `app/layout.tsx`, `app/globals.css`,
`components/layout/menu-movil.tsx`, `components/layout/marca.tsx`,
`components/layout/page-header.tsx`, `components/ui/sheet.tsx`,
`scripts/capturas.mjs`, `public/logo-csj.png`. Sin migración.

Verificado por el túnel simulado con la aplicación levantada: React hidrata, el
hamburguesa abre, el panel cierra al tocar un link —también el de la pantalla en
la que ya se está—, el desplegable de perfil abre, el login entra, y no queda ni
un error en consola ni una request fallida. Las diez pantallas no se salen por el
costado. Lint, 117 tests y build pasan.

### ✅ Fase 8 — Tres arreglos chicos

Commit `24e8013`. Validada por Lisandro el 28/08/2026. Migración
`20260828135455_codigo_agente`. Sin relación entre
sí, pero los tres son de pocas líneas y no justifican una fase cada uno. Salieron
cuatro: probando el primero apareció uno más de fondo.

#### 8.1 El toast que miente

Salía un aviso de *"Cuenta creada"* al abrir la ficha de un vendedor sin cuenta,
sin que nadie hubiera creado nada. `crear-usuario-form.tsx` daba por exitoso
cualquier estado sin errores:

```ts
const exito = Boolean(estado) && !estado.error && !estado.errores;
```

El estado inicial del `useActionState` es `{}`, que no tiene ni `error` ni
`errores` y además es *truthy*: `exito` daba `true` en el primer render y el
`useEffect` disparaba el toast al montar. El `useRef` de al lado evitaba el toast
**repetido**, no el **prematuro**.

Lo esperable era cambiarlo por `estado.ok`, que es el campo que usa el resto del
proyecto y que el tipo `EstadoFormulario` ya declara. Se hizo, y **el toast
seguía sin aparecer nunca**, ahora en el otro sentido: `crearUsuarioVendedor`
revalida la ficha, que al volver ya no dibuja el formulario sino la cuenta recién
creada. El componente se desmonta en el mismo commit en que llega el estado
nuevo, así que el `useEffect` que mostraría el toast no llega a correr.

O sea que el toast prematuro venía tapando que el toast de éxito no existía.
Se sacó, y quedó dicho en el componente por qué no está. No hace falta: donde
estaba el formulario aparece la cuenta con su email, que es un cambio bastante
más visible que un aviso de cuatro segundos. El toast que sí funciona —el de
`form-contacto.tsx`— vive en un formulario que sigue en pantalla después de
guardar.

`crearUsuarioVendedor` devuelve igual `{ ok: true }` en vez de `{}`: es el
contrato del tipo y lo que devuelven todas las demás acciones.

#### 8.2 Editar un plan

Los planes sólo entraban por el Excel de precios: no había alta manual, ni
edición, ni baja.

- `lib/validations/plan.ts` nuevo: `nombre`, `duracionMeses` opcional y `activo`.
  **`codigoProducto` no se edita** —se muestra deshabilitado y se dice por qué—:
  es la clave con la que el Excel encuentra al plan, y cambiarlo a mano haría que
  la lista siguiente cree un plan nuevo en vez de actualizar éste.
- `editarPlan` en `app/admin/planes/actions.ts`, `components/planes/plan-form.tsx`
  y `app/admin/planes/[id]/editar/page.tsx`, con el molde del par alta/edición de
  vendedores. El listado gana una columna con el botón **Editar**.
- El campo **Nombre** va primero aunque ocupe las dos columnas: en el teléfono la
  grilla se apila y ése es el único orden que se ve, así que dejarlo tercero
  —detrás del código, que ni siquiera se edita— era esconder lo que se viene a
  cambiar.
- **El upsert de la importación dejó de pisar el catálogo.** Forzaba `nombre` y
  `activo: true` en cada archivo, así que dar de baja un plan a mano o corregirle
  el nombre no sobrevivía a la lista siguiente. Ese archivo es de **precios**, no
  de catálogo: el `update` del upsert quedó vacío y el `create` sigue igual, así
  que un plan nuevo entra con lo que diga el Excel y de ahí en más manda lo que
  edite Balta.
- No se agregó alta manual ni borrado: no se pidieron, y borrar un plan con
  ventas falla igual (`Venta.planId` es FK sin cascade). Dar de baja es `activo`.

#### 8.3 Código de agente en el perfil del admin

- Migración `codigo_agente`: `User.codigoAgente String?`. Es de la persona y no
  de la zona (supuesto anotado en Pendientes); no confundir con `Vendedor.codigo`,
  que sí es por zona y es el código del **vendedor**.
- `contactoAdminSchema` lo suma como opcional, **texto y no entero**: es un
  identificador, no una cantidad, y como número se rompería uno que empiece con
  cero (regla de la Fase 6).
- El input va en el bloque de admin de `form-contacto.tsx` y el valor se muestra
  en la card "Tu cuenta" de `/perfil`.

#### 8.4 Ningún error de duplicado decía cuál (encontrado de paso)

Probando 8.1 con un email ya usado, el formulario contestaba **"Datos
duplicados."** en vez de *"Ya hay una cuenta con ese email."*, aunque el mensaje
existe en `lib/errores-prisma.ts` desde siempre.

La causa no es de esta pantalla: `camposDuplicados` leía `error.meta.target`, que
es donde Prisma ponía la columna que chocó. **Con un driver adapter —este
proyecto usa `@prisma/adapter-pg`— ese campo ya no se completa**; el detalle
viene del driver, en `meta.driverAdapterError.cause.constraint.fields`. Como
`target` era `undefined`, la función devolvía `[""]`, ninguna comparación daba y
`erroresPorDuplicado` terminaba siempre en `null`.

Afectaba a todo el proyecto, no sólo al alta de cuenta: el DNI repetido de un
vendedor y el código repetido en la zona tampoco marcaban su campo. Ahora se
miran las dos formas —la del driver y el `target` clásico— y cuando no se puede
saber se devuelve una lista vacía, que es distinto de `[""]`. Tiene tests
(`lib/errores-prisma.test.ts`) con capturas textuales de las dos formas del
error, porque esto es exactamente lo que se rompe en silencio al subir de versión.

**Archivos**: `app/admin/vendedores/actions.ts`,
`components/vendedores/crear-usuario-form.tsx`, `app/admin/planes/actions.ts`,
`app/admin/planes/page.tsx`, `app/admin/planes/[id]/editar/page.tsx`,
`components/planes/plan-form.tsx`, `lib/validations/plan.ts`,
`lib/validations/perfil.ts`, `components/perfil/form-contacto.tsx`,
`app/perfil/page.tsx`, `lib/errores-prisma.ts`, `lib/errores-prisma.test.ts`,
`prisma/schema.prisma`. Migración `20260828135455_codigo_agente`.

Verificado con la aplicación levantada sobre el build: abrir la ficha de un
vendedor sin cuenta no muestra ningún aviso; crear la cuenta reemplaza el
formulario por la cuenta con su email; repetir un email marca el campo con el
mensaje correcto y deja el formulario en pantalla; el plan editado conserva
nombre y estado después de reimportar la lista de precios, que sí actualiza el
precio; el plan dado de baja desaparece del formulario de venta; el código de
agente se guarda y se ve en "Tu cuenta". Ninguna pantalla se sale por el costado
en el teléfono. Lint, 126 tests y build pasan.

### ✅ Fase 9 — Padrón: varios archivos y un selector que se entienda

Commit `96f7c45`. Sin migración: el motor de importación no se tocó, lo que
cambia es cuántas veces se lo llama y con qué pantalla.

#### 9.1 Varios archivos por vez

**Un `PadronImport` por archivo, importados en orden, cada uno en su
transacción.** No se juntan las filas de todos en una sola llamada a
`importarPadron` aunque la función lo aceptaría: `origenDeTituloNuevo` decide
venta nueva vs. renovación por la cuota más baja **del conjunto de filas que
recibe**, así que mezclando meses un título que renovó en septiembre quedaría
como venta nueva porque su cuota 1 llega en otro archivo. Además `esLineaBase`
tiene que ser cierto para uno solo, y tanto el histórico de `/admin/padron`
como las barras del dashboard cuentan una fila por archivo.

**El orden lo decide el período que trae el archivo, no la selección.** El
explorador de Windows los entrega alfabéticamente, y el nombre que les pone el
club (`Padron-siscaho-tucu-167-010626.xls`) no dice el mes en el lugar que
haría falta. Como de ese orden salen las comisiones, la regla vive en
`lib/padron/tanda.ts` —función pura, con tests— y **se muestra numerada en
pantalla antes de confirmar**, con la explicación de por qué importa.

Lo que cambia en el flujo:

1. **Paso 1** — el input acepta varios. Se valida extensión, tamaño y cantidad
   de cada uno y se parsean **todos antes de guardar ningún temporal**: si el
   tercero está roto, no tienen por qué quedar dos archivos huérfanos en
   `uploads/tmp` de una tanda que nunca existió. El mensaje de error nombra al
   archivo que falló.
2. **Paso 2** — con un solo archivo la pantalla quedó **exactamente como
   estaba**, con el panel "Qué va a pasar si confirmás". Con varios muestra la
   lista ordenada (nombre, meses, filas) y dice que las cifras se ven al
   terminar: la simulación del segundo correría contra una base que todavía no
   tiene importado el primero, así que serían números que no se van a cumplir.
   Mostrarlos igual sería peor que no mostrarlos.
3. **La vinculación de vendedores se pide una sola vez**, sobre la unión de los
   `NomVen` de todos los archivos, y sigue bloqueando la importación completa
   hasta que no quede ninguno suelto. Imputarle cuotas al vendedor equivocado
   rompe el cálculo de comisiones, y con siete archivos el error se multiplica.
4. **Paso 3** — se importan uno por uno y se muestra el `PanelResumenPadron`
   **real** de cada uno. Si uno falla, los anteriores quedan importados —son
   archivos independientes y deshacerlos sería peor— y se dice cuál se cortó y
   que no hay que volver a subir los que entraron.
5. **Tope de 10 archivos por tanda**, que no es un número elegido por
   prolijidad: el `bodySizeLimit` es de 25 MB para toda la request y un padrón
   real pesa cerca de 2 MB. Pasado ese techo la subida falla **antes** de
   llegar a la acción, o sea sin ningún mensaje que se entienda, así que el
   aviso lo da el navegador con la cuenta hecha —y el servidor lo vuelve a
   chequear igual, porque una server action es un endpoint—.

**Y el "Cancelar" ahora cancela de verdad.** Era un `<Link>`, así que
`descartarPadron` estaba exportada desde el principio y no la llamaba nadie:
cada importación abandonada dejaba dos archivos por padrón en `uploads/tmp`,
para siempre. Ahora es un submit del mismo formulario a esa acción —así se
lleva los tokens—, que borra los temporales y vuelve al histórico.

> En la base de desarrollo había **74 archivos** acumulados ahí. Se pueden
> borrar a mano: son restos de importaciones abandonadas y nada los referencia.

#### 9.2 El selector de archivos

Era un `<input type="file">` pelado: no se leía como algo clickeable y, después
de elegir, el texto seguía diciendo exactamente lo mismo. Ahora es
`components/layout/selector-archivos.tsx`: zona con borde punteado, ícono,
arrastrar y soltar, y **cuando ya hay archivos el texto desaparece y en su lugar
va la lista** con nombre, peso y una X para sacar cada uno.

Vive en `layout/` y no en `padron/` porque lo usan las tres importaciones
—padrón, leads y lista de precios—: era literalmente el mismo input con el mismo
problema, y dejar dos distintos hubiera sido peor que unificarlos.

Tres cosas que no se ven leyendo el componente:

- **`input.files` es de sólo lectura salvo que se le asigne un `FileList`, y la
  única forma de fabricar uno a mano es con un `DataTransfer`.** Es lo que
  permite sacar un archivo de la selección sin obligar a elegirlos todos de
  nuevo, y lo que hace que la lista de la pantalla y lo que se envía sean lo
  mismo.
- **El input no se vacía antes de abrir el selector.** La primera versión lo
  hacía —es el truco para que elegir dos veces el mismo archivo dispare
  `change`—, y con eso, si el usuario cancelaba el cuadro de diálogo, el input
  quedaba sin archivos mientras la lista los seguía mostrando: se enviaba un
  formulario vacío sin que nada lo delatara.
- **El input real sigue en el DOM, transparente y sin eventos, encima de la
  zona.** No va en `display: none` porque un campo `required` escondido de
  verdad hace que el navegador no pueda mostrar su propio aviso de "completá
  este campo".

**El nombre del archivo se parte en dos renglones en vez de cortarse con
puntos suspensivos.** Los del club se llaman `Padron-siscaho-tucu-167-010626.xls`
y lo único que los distingue son los últimos dígitos: truncar por el final es
truncar justo la parte que hay que leer.

El período de cada archivo aparece en el paso 2 y no en el selector: leerlo
antes exigiría parsear el Excel en el navegador, o sea meter SheetJS en el
bundle de cliente para adelantar un dato que la pantalla siguiente ya muestra.

**Archivos**: `app/admin/padron/actions.ts`,
`app/admin/padron/importar/page.tsx`, `components/padron/importar-padron.tsx`,
`components/layout/selector-archivos.tsx` (nuevo), `lib/padron/tanda.ts` y
`lib/padron/tanda.test.ts` (nuevos), `components/leads/importar-leads.tsx`,
`components/planes/importar-precios.tsx`, `scripts/capturas.mjs`.
**`lib/padron/importarPadron.ts` no se tocó.**

Verificado contra la aplicación levantada, vaciando Salta y subiendo **los 7
padrones de prueba de una sola vez y en orden desordenado a propósito**: el
sistema los ordenó por período y los números finales dieron **exactamente los
mismos** que subiéndolos de a uno —`PRUEBA VENDEDOR UNO` $105.000, `DOS`
$38.000, comisión del agente $564.000 sobre 54 cuotas, `PT-0006` renovación y
`PT-0007` caído—, con 7 filas en el histórico y `esLineaBase` en una sola.
Además: reimportar la tanda no trae novedades, un archivo que no es un padrón
corta la tanda nombrándose y sin dejar temporales, la vinculación de vendedores
se pide una vez para los dos archivos que la necesitaban, y Cancelar borra los
dos temporales que había creado. Lint, 134 tests y build pasan; ninguna pantalla
se sale por el costado en el teléfono.

### ✅ Fase 10 — Clientes: corregir los datos y ver la documentación

Commit `351e633`. Migración `20260828231830_campos_manuales_cliente`.

#### 10.1 Editar los datos personales — sólo admin

La ficha del cliente era de sólo lectura y no existía ninguna server action de
cliente: el único que escribía era el importador.

**El problema de fondo no era la falta de un formulario.**
`lib/padron/importarPadron.ts` comparaba los seis campos personales (`nombre`,
`domicilio`, `telefono`, `codPos`, `localidad`, `email`) y, si **cualquiera**
difería, empujaba **los seis** juntos. Con eso, un teléfono corregido a mano
duraba hasta el padrón siguiente. Y había un segundo agujero, peor: ninguna de
las cinco columnas opcionales está en `COLUMNAS_REQUERIDAS`, así que un Excel
sin la columna `Email` se importaba igual y **borraba el email de toda la
zona** — `parsePadron` devolvía `null` tanto para "la celda está vacía" como
para "la columna no existe".

Definición de Lisandro: **manda el dato corregido**.

- **`lib/padron/camposCliente.ts` (nuevo)** decide qué campos toca el padrón.
  Es función pura y tiene 15 tests, por la misma razón que el motor de
  comisiones: acá un bug no rompe la pantalla, borra el domicilio de miles de
  clientes sin que nadie se entere.
- **`Cliente.camposManuales String[]`**, más `editadoPorUserId` y `editadoAt`
  (que además alimentan la Actividad de la Fase 12). Un array y no seis
  booleanos, para no migrar cada vez que aparezca un campo nuevo.
- **`parsePadron` informa qué columnas personales encontró**
  (`columnasPersonales`) e `importarPadron` recibe esa lista y no escribe los
  campos que no vinieron. La opción es opcional y por omisión asume que
  estaban todas, que es como se comportaba antes.
- **Se marcan sólo los campos que efectivamente cambiaron.** Abrir el
  formulario y guardar sin tocar nada no blinda los seis contra el padrón.
- **El DNI no se edita** y se dice en la pantalla: es la clave
  `@@unique([zonaId, dni])` y es con lo que el padrón encuentra al cliente.
  Cambiarlo a mano crearía un cliente duplicado en la importación siguiente.
- **El teléfono va como texto libre**, no como dígitos —al revés que en el
  formulario de venta—: este campo lo llena el padrón, que trae cosas como
  `4231234 / 155-667788`. Normalizarlo dejaría un valor que el club nunca
  escribió.
- **UI**: botón **Corregir datos** en la ficha, pantalla
  `/admin/clientes/[id]/editar`, badge **"corregido a mano"** en cada campo
  marcado, el pie *"Un dato corregido por X el …"* y un botón **"Volver a
  tomar todo del padrón"**. Ese botón **saca las marcas, no revierte los
  valores**: el padrón es el que manda el dato, así que la próxima importación
  que traiga a ese cliente los va a pisar sola.

#### 10.2 La documentación en la ficha del cliente

No hay FK de `Venta` a `Cliente`: la venta duplica `nombreCliente` y `dni` como
texto, y `Venta.tituloId` existe en el schema pero **no lo escribe nadie**. El
único camino real es `Cliente.dni + zonaId` → `Venta` → `Venta.adjuntos`, y la
card lo dice en pantalla para que nadie suponga que faltan adjuntos cuando lo
que falta es la venta cargada con ese DNI.

- Card **Documentación** entre los datos de contacto y la lista de títulos, con
  miniatura para las imágenes, ícono para los PDF, fecha, quién lo subió y de
  qué venta salió.
- Se sirven por `/api/uploads/[id]`, que **ya autorizaba a un ADMIN por zona
  activa**: no hubo que tocar permisos. Verificado que sin sesión responde
  **401**.
- Las miniaturas van con `unoptimized`: el optimizador de Next no puede leer
  una ruta autenticada.
- El identificador de la venta **no linkea**. La ficha de una venta hoy es sólo
  del vendedor (`/vendedor/ventas/[id]`) y un admin que entre ahí se va
  rebotado al dashboard; el link se agrega en la Fase 11, que crea
  `/admin/ventas/[id]`.

**Archivos**: `lib/padron/camposCliente.ts` y `lib/padron/camposCliente.test.ts`
(nuevos), `lib/validations/cliente.ts` (nuevo), `app/admin/clientes/actions.ts`
(nuevo), `app/admin/clientes/[id]/editar/page.tsx` (nueva),
`components/clientes/cliente-form.tsx` y
`components/clientes/documentacion-cliente.tsx` (nuevos),
`app/admin/clientes/[id]/page.tsx`, `lib/excel/parsePadron.ts`,
`lib/padron/importarPadron.ts`, `app/admin/padron/actions.ts`,
`scripts/verificar-padron.ts`, `prisma/schema.prisma`.

Verificado contra la base de desarrollo: un teléfono corregido a mano sobrevive
a reimportar el padrón mientras el domicilio divergente sí vuelve al valor del
club; un archivo **sin** la columna `Email` no borra el email, y uno **con** la
columna vacía sí lo vacía (que es lo correcto). Por pantalla: la card de
documentación muestra el adjunto de una venta cargada con ese DNI, la miniatura
se sirve **200** con sesión y **401** sin ella, el DNI está deshabilitado en el
formulario, el badge y el pie aparecen al corregir y desaparecen con "Volver a
tomar todo del padrón". Después se vació Salta y se reimportaron los 7 padrones:
comisiones **$105.000 / $38.000**, agente **$564.000** con margen **$421.000**,
1 caído y 1 renovación — los mismos números de siempre. Lint, **149 tests** y
build pasan; ninguna de las dos pantallas se sale por el costado en el teléfono.

### ✅ Fase 11 — Ventas: confirmar, editar desde admin, foto con la cámara

Commit `aa06212`. Migración `20260901225241_anulacion_venta`.

#### 11.1 Confirmación al crear

El botón "Cargar venta" pasó a `type="button"` y abre un cuadro con el resumen
de lo que se va a guardar: vendedor, plan, cliente, DNI, teléfono, el
identificador —título o suscripción, el que corresponda— y si lleva adjuntos.
Dos salidas: **Revisar** y **Confirmar y cargar**.

**Aplica al alta, no a la edición.** Cargar una venta escribe un dato que
después hay que perseguir para corregir; guardar cambios sobre algo que ya
existe queda en el historial y no necesita ceremonia.

Tres cosas que hubo que hacer bien:

- **Radix portalea el `DialogContent` al `<body>`**, así que el botón de
  confirmar queda fuera del `<form>` en el DOM y un `type="submit"` a secas no
  enviaría nada. Lo que lo ata al formulario es el atributo `form="…"`, que sí
  cruza el portal. En el JSX el diálogo se renderiza **dentro** del `<form>`
  igual, para que `useFormStatus` lo siga viendo por contexto y el botón pueda
  decir "Guardando…".
- **`reportValidity()` antes de abrir**: no tiene sentido resumir un formulario
  incompleto. Para que eso alcance, "Nro Suscripción" y "Observación" ahora
  llevan `required` **dinámico**, siguiendo la misma regla que ya movía el
  asterisco. El servidor las valida igual: la pantalla no es la que manda.
- **Si la acción vuelve con un error, el diálogo se cierra**, porque el aviso
  aparece arriba del formulario y el cuadro lo estaría tapando. Se ajusta
  durante el render y no en un `useEffect`: con un efecto sería un render
  encadenado de más, y acá no hay ningún sistema externo que sincronizar.

#### 11.2 El admin gana ficha, edición y anulación

Balta cargaba una venta desde `/admin` y después no la podía ni ver: no existía
`/admin/ventas/[id]`, y `editarVenta` exigía `requirePermiso("cargarVentas")`
—que obliga rol VENDEDOR— y scopeaba por `vendedorId`.

- **`aplicarEdicion` es un solo motor** y lo único que cambia es el alcance: el
  vendedor toca las suyas (`vendedorId`), el admin las de la zona activa
  (`zonaId`). Validación, diff del historial, adjuntos y transacción son los
  mismos: Lisandro pidió que el admin tuviera **las mismas** opciones, no un
  subconjunto parecido.
- **Ficha y edición nuevas** en `/admin/ventas/[id]` y `/admin/ventas/[id]/editar`,
  con el vendedor a la vista y link a su ficha. El listado gana el botón **Ver**
  y la tarjeta del celular entera navega.
- **El plan dado de baja se conserva pero no se ofrece.** Era la unificación que
  pedía el plan —el alta filtraba por `activo` y la edición no—, resuelta en el
  sentido que no rompe nada: sin eso, editar el teléfono de una venta vieja
  obligaba a cambiarle el plan, porque el `<select>` no encontraba su valor y
  aparecía vacío.
- **Anular** pide un motivo escrito, marca la venta y **no borra nada**: sigue
  en los dos listados —atenuada—, con sus adjuntos y su historial. **No toca
  ninguna comisión**, porque el cálculo sale del padrón y no de `Venta`, y eso
  se dice en el cuadro de confirmación. Una venta anulada no se edita: el botón
  no aparece y la URL de edición rebota a la ficha.
- **Reactivar no estaba en el pedido y se agregó igual.** Anular sin vuelta
  atrás convierte un click equivocado en un dato irrecuperable, y el sistema ya
  trata así a los períodos de comisión, que se cierran y se pueden reabrir. Al
  reactivar se limpian `anuladaAt`, `anuladaPorUserId` y `motivoAnulacion`
  —describen el estado actual, no el pasado—, y por eso el motivo se guarda
  **además** en `VentaHistorial`: si no, una venta anulada y reactivada no
  dejaría rastro de por qué se había anulado.
- El vendedor también ve el aviso de anulada en su ficha, sin el botón de
  editar y con la explicación de a quién pedirle que la reactive.

#### 11.3 Foto del DNI: cámara o galería

`components/ventas/campo-foto.tsx`, que reemplaza a los dos `<input type="file">`
del formulario.

- **Dos botones** —*Sacar foto* y *Elegir archivo*— sobre **un solo input**, al
  que se le pone o se le saca `capture="environment"` con JS justo antes del
  `.click()`. Dos inputs con el mismo `name` harían que el vacío pise al lleno
  al enviar.
- **Vista previa** con `URL.createObjectURL`, más *Quitar* y *Sacar otra*. Es lo
  que hace que sirva desde la calle: una foto de un DNI sacada de apuro sale
  movida la mitad de las veces, y sin verla eso no se descubre hasta que Balta
  abre el adjunto una semana después.
- No se vacía el input antes de abrir el selector —cancelar el diálogo dejaría
  un formulario vacío que en pantalla se ve lleno— y el input no se esconde con
  `display: none`. Las dos reglas ya estaban aprendidas en el selector del
  padrón.
- **`TIPOS_ADJUNTO_PERMITIDOS` no cambió, y esa es la conclusión de revisarlo.**
  El plan sospechaba que había que agregar HEIC para las fotos del iPhone; es al
  revés. Mientras el `accept` no mencione HEIC, iOS **transcodifica a JPEG** al
  elegir la foto; agregarlo haría que mande el HEIC crudo, que Chrome en Windows
  no puede mostrar, y Balta terminaría con fotos de DNI que no puede abrir. Lo
  que sí se arregló es el mensaje: si igual llega un HEIC, la pantalla dice
  cómo cambiar el formato en el teléfono en vez de un "tipo no permitido".

De paso, se cerró el pendiente que dejó la Fase 10: en la card de documentación
del cliente, el identificador de la venta **ahora sí linkea**, porque
`/admin/ventas/[id]` existe.

**Archivos**: `components/ventas/campo-foto.tsx` y
`components/ventas/acciones-venta.tsx` (nuevos), `app/admin/ventas/[id]/page.tsx`
y `app/admin/ventas/[id]/editar/page.tsx` (nuevas),
`components/ventas/venta-form.tsx`, `app/vendedor/ventas/actions.ts`,
`app/vendedor/ventas/[id]/page.tsx`, `app/vendedor/ventas/[id]/editar/page.tsx`,
`app/admin/ventas/page.tsx`, `app/admin/ventas/nueva/page.tsx`,
`components/clientes/documentacion-cliente.tsx`, `lib/validations/venta.ts`,
`prisma/schema.prisma`.

Verificado con Playwright contra el build de producción, **43 comprobaciones en
escritorio y las mismas 43 en viewport de iPhone**: el resumen no se abre con el
formulario incompleto, muestra lo que se va a guardar, "Revisar" no crea nada y
"Confirmar" sí; la ficha de admin abre, la edición guarda y queda en el
historial; anular sin motivo no anula, con motivo marca la venta, esconde el
botón de editar, rebota la URL de edición y la muestra anulada en el listado;
reactivar la devuelve y el historial conserva los dos movimientos; los dos
botones de foto ponen y sacan `capture`, la vista previa aparece, "Quitar" vacía
el input y el resumen nombra el adjunto. Ninguna de las cuatro pantallas se sale
por el costado en el teléfono. Lint, **149 tests** y build pasan.

**Un bug propio encontrado en el camino**: al hacer clickeable la tarjeta del
listado quedó un `<a>` —el de "Ver DNI"— dentro de otro `<a>`, que es HTML
inválido y rompía la hidratación de `/admin/ventas` en el celular. La tarjeta
ahora dice "con foto del DNI" y el archivo se abre desde la ficha.

**Lo único que no se pudo probar desde el navegador** es el lado del vendedor
—su ficha con el aviso de anulada y su edición—, porque hace falta iniciar
sesión con una cuenta de vendedor y sus contraseñas no están en el repositorio.
El código es el mismo motor ya verificado desde admin, pero conviene que
Lisandro lo mire con su cuenta: está anotado como paso 7 de la guía.

### ✅ Fase 12 — Actividad: leads + ventas, filtrable por vendedor

Migración `20260902141500_actividad_unificada`, **escrita a mano**.

#### 12.1 De log de leads a log de todo

`LeadActividad` servía para una sola cosa: `leadId` obligatorio, la zona derivada
del lead y ningún vendedor propio. Pasó a ser **`Actividad`**, con `zonaId` y
`vendedorId` propios, `ventaId` y `clienteId`, y un `cambios Json?` para los
diffs. El enum `LeadActividadTipo` (ASIGNACION / CAMBIO_ESTADO) es ahora
`ActividadTipo` con siete valores.

- **La migración no la generó Prisma y no podía generarla.** Prisma resuelve un
  renombre de tabla como DROP + CREATE, y eso borraría el histórico de
  asignaciones y cambios de estado que ya está cargado —justo lo que el admin usa
  para ver qué hicieron los vendedores—. La escrita a mano renombra la tabla, sus
  constraints y su índice, y rellena `zonaId` y `vendedorId` desde el lead.
- **El enum se convierte con un CAST, no renombrando valores.**
  `ALTER TYPE … ADD VALUE` no se puede usar dentro de la misma transacción que lo
  agrega y las migraciones de Prisma corren en una, así que se crea el tipo nuevo
  y se convierte la columna con `('LEAD_' || tipo::text)::"ActividadTipo"`: el
  prefijo es exactamente lo que transforma los dos valores viejos en los nuevos.
- **`vendedorId` y `actorUserId` son cosas distintas.** El vendedor es a nombre de
  quien queda el movimiento —el eje del filtro que pidió Lisandro—; el actor es
  quien apretó el botón. Cuando Balta carga una venta a nombre de Nancy, el filtro
  la trae por Nancy y la pantalla muestra que la cargó Balta. Confundirlos habría
  hecho que filtrar por un vendedor no mostrara ninguna de las ventas que Balta le
  cargó.
- El histórico quedó con la zona completa; los tres registros cuyo lead ya no
  tiene vendedor asignado quedaron sin vendedor, que es lo correcto: devolver un
  lead lo libera, y esa actividad no es de nadie.

#### 12.2 Dónde se escribe

`lib/actividad/registrar.ts`, con `registrarActividad(tx, …)` para el caso normal
y `datosActividad()` para armar la fila sin tocar la base.

- **Siempre dentro de la transacción que la acción ya tenía abierta.** Si la venta
  se guarda y la actividad no, el feed miente; al revés es peor todavía.
- La asignación masiva de leads es la excepción y usa `createMany`: asignar
  doscientos leads con doscientos `create` son doscientos viajes a la base.
- **`Actividad.cambios` duplica el diff de `VentaHistorial`** a propósito. Sin esa
  copia el feed tendría que hacer un join distinto por cada tipo de evento para
  dibujar un renglón. `VentaHistorial` se conserva: es el detalle de la ficha.
- **La reactivación también se registra**, aunque el plan no la tenía prevista.
  Sin ella el feed muestra anulaciones de ventas que después aparecen activas y no
  se entiende por qué.
- **Subir un adjunto al editar entró al registro, y no estaba.** La foto del DNI
  es opcional justamente para poder cargar la venta desde la calle, así que
  subirla después es la edición más común que hay — y hasta ahora no dejaba rastro
  ni en el historial de la ficha ni en ningún lado. Va al diff como `adjuntoDni` /
  `adjuntoContrato`, que no son columnas de `Venta`: por eso el `update` de la
  venta se decide con su propio flag y no con "hay cambios".

#### 12.3 La pantalla

- **Filtro por vendedor** (`?vendedor=<id>`), `<select>` nativo en un `<form>` GET.
  **El id se valida contra los vendedores de la zona**: uno de la otra zona no
  filtraría nada, mostraría el feed entero y haría creer que ese vendedor movió
  todo.
- **Chips por familia —Leads · Ventas · Clientes— y no uno por tipo.** Con siete
  tipos la fila de chips ocupaba tres renglones en el celular, y nadie quiere
  filtrar "sólo reactivaciones": lo que se busca es qué pasó con las ventas. El
  tipo exacto se lee igual en cada renglón. Los contadores cuentan sobre el
  vendedor elegido y no sobre la familia activa, para poder saltar de una a otra
  sin perder el número — la misma regla que los chips de caída en Clientes.
- **Tarjetas en el celular**, con el diff adentro del encabezado y no del `<dl>`:
  un `<ul>` dentro de un `<dl>` es HTML inválido.
- **El render del diff se extrajo** a `components/actividad/lista-cambios.tsx` y lo
  usan las dos pantallas. Junta las etiquetas de venta y de cliente, porque el
  renglón no tiene por qué saber de cuál viene el campo.
- **La paginación conserva los filtros.** Antes los links de Anterior/Siguiente
  volvían al feed sin ellos y la página 2 mostraba otra cosa.
- No hay ficha de lead en `/admin`, así que el renglón de un lead linkea a
  `/admin/leads?q=<nombre>`, que es lo más cerca que se llega.

**Archivos**: `lib/actividad/registrar.ts` y
`components/actividad/lista-cambios.tsx` (nuevos), `app/admin/actividad/page.tsx`
(reescrita), `app/admin/leads/actions.ts`, `app/vendedor/ventas/actions.ts`,
`app/admin/clientes/actions.ts`, `components/ventas/historial-venta.tsx`,
`app/vendedor/leads/[id]/page.tsx`, `lib/validations/venta.ts`,
`prisma/schema.prisma`.

Verificado con Playwright contra el build de producción, **35 comprobaciones en
escritorio y 39 en viewport de iPhone**: los seis tipos de evento entran al feed
—asignación de lead, alta, edición, anulación y reactivación de venta, y
corrección de cliente—; la edición muestra el diff viejo → nuevo con la etiqueta
del campo; la anulación muestra el motivo escrito; el alta queda a nombre del
vendedor y dice que la cargó Balta; los tres chips filtran y conservan el vendedor
elegido; el filtro por vendedor deja fuera la corrección de cliente (que no es de
nadie del equipo) y un id inventado se ignora en vez de mentir; la ficha de la
venta conserva su historial con el mismo render; en el celular se dibujan las
tarjetas y ninguna de las dos vistas se sale por el costado. **El histórico
sobrevivió a la migración** y se sigue leyendo con los tipos nuevos, que es lo que
había que demostrar. Lint, **149 tests** y build pasan.

---

## Tercera tanda (03/09/2026) — QA de todo lo construido

Lisandro pidió, antes de abrir el módulo del vendedor, una pasada completa sobre
lo que ya está: buscar filtraciones, verificar front y back, y comprobar que
funcione **con las cuentas de Balta y de Pedro, en Salta y en Tucumán**.

No es una revisión preventiva sin motivo. [`PENDIENTE.md`](PENDIENTE.md) ya tenía
anotado que faltaba *"una pasada completa sobre el resto de las URLs de admin
antes de producción"*, y el relevamiento del 03/09/2026 encontró tres defectos
reales — uno de los cuales **impide operar la segunda zona**.

Lo que el relevamiento encontró **bien**, revisado archivo por archivo, para no
volver a mirarlo: las 24 páginas de `/admin` llaman a `requireAdmin` y las 8 del
vendedor a `requireVendedor`/`requirePermiso`; las 40+ server actions tienen guard
propio y no dependen del layout; las 12 rutas `[id]` cargan con `findFirst`
cruzando `{id, zonaId}` o `{id, vendedorId}`, así que **no hay IDOR de lectura**;
ninguna query de negocio queda sin `zonaId` sobre un modelo que tenga la columna;
`/api/uploads/[id]` —las fotos de DNI— aguanta el análisis; y nada lee el rol ni
los permisos del JWT para autorizar.

Fuera de alcance por decisión de Lisandro: el repaso previo al despliegue en
Railway (variables, volumen de adjuntos, contraseñas reales, laboratorio
inexistente en producción). Queda como fase aparte para cuando se decida publicar.

### ✅ Fase 13 — Los tres agujeros

Va primera porque **13.1 desbloquea la segunda zona**: sin eso no se puede
importar el padrón de Tucumán, y sin padrón de Tucumán no se puede probar nada de
lo que sigue.

#### 13.1 El alias de vendedor traba la importación de la segunda zona

`VendedorAlias.nomVenPadron` es `@unique` **en todo el sistema**, pero los tres
lugares que lo usan filtran por zona: `importarPadron.ts` y `nomVenSinVincular`
leen con `vendedor: { zonaId }`, y la escritura es un
`createMany({ skipDuplicates: true })`.

Con Pedro apareciendo en los padrones de las dos zonas —es el pendiente 4, con
tres alias y 254 filas—, `TOLEDO PEDRO` sólo puede pertenecer a **una** ficha. Si
ya está vinculado en Salta y se importa el padrón de Tucumán: la consulta filtrada
por zona no lo encuentra, sale como "sin vincular", la importación se corta, y al
intentar vincularlo el `skipDuplicates` **lo saltea en silencio**. La pantalla
vuelve a pedir el mismo nombre indefinidamente, sin un solo mensaje de error. Hoy
no tiene salida por la interfaz: la card "Nombres en el padrón" de la ficha del
vendedor es de sólo lectura.

**Arreglo: `zonaId` propio en `VendedorAlias`, con `@@unique([zonaId, nomVenPadron])`.**
No sirve `@@unique([vendedorId, nomVenPadron])`: dejaría el mismo nombre vinculado
a dos vendedores de la misma zona y la resolución elegiría uno arbitrario, que es
justo lo que la regla de negocio prohíbe. La regla real es "un `NomVen` pertenece
a un solo vendedor **dentro de una zona**", y Postgres no puede expresar eso
contra una columna de otra tabla: hay que denormalizar. El dato es estable —un
vendedor nunca cambia de zona— y de paso los lectores dejan de necesitar el join.

El `createMany({ skipDuplicates: true })` pasa a `upsert`. El choque dentro de la
zona deja de ser silencioso: es un error que se informa con el nombre del vendedor
que ya tiene ese alias.

#### 13.2 `leadId` sin validar al crear una venta

`registrarVenta` toma el `leadId` del formulario y lo persiste sin verificar nada.
Lo revelador es que 44 líneas más abajo, para cambiar el **estado** del lead, sí se
valida contra `vendedorAsignadoId`: la comprobación existe, pero se aplicó a una
sola de las dos escrituras.

Se convierte en fuga de lectura porque las dos fichas de venta hacen join al lead
sin filtro extra. Un vendedor de Salta que postee una venta con el id de un lead de
Tucumán ve su nombre en su propia ficha — cruza la frontera de zona, que es lo que
el sistema promete que no pasa. Atenuante: los ids son `cuid` y hay que conocerlos
de antemano.

El arreglo es subir esa misma consulta por encima del `create` y usar el lead que
devuelve. No hace falta ninguna validación nueva.

#### 13.3 Link a una ficha de lead que no existe

La ficha de la venta en admin linkea a `/admin/leads/<id>`, que da 404: no hay
ficha de lead en `/admin`. La Fase 12 ya resolvió este mismo caso en el feed de
actividad linkeando a `/admin/leads?q=<nombre>`, y está documentado en
`CLAUDE.md`. Se aplica el mismo criterio.

#### 13.4 Tres cosas menores que salieron en el camino

- **`volverA` sin validar en el login**: va directo a `redirectTo`. No es
  explotable —Auth.js lo normaliza contra `baseUrl`— pero el patrón correcto ya
  existe en `seleccionar-zona/actions.ts` y no cuesta nada cerrarlo.
- **Una zona inexistente en la cookie da un CRM vacío sin explicación**:
  `getZonaActivaId` valida que sea un entero positivo, no que exista. No es
  escalada de privilegios —los dos admins ven las dos zonas igual—, pero conviene
  mandar al selector en vez de dibujar pantallas vacías.
- **Cambiar de zona siempre deposita en el dashboard.** `seleccionarZona` sabe
  volver a donde estabas, pero **ningún llamador manda `volverA`**. Se saca el
  código muerto: volver a la misma pantalla en la otra zona daría `notFound()` en
  toda ficha de detalle.

#### 13.5 El padrón de una zona pisaba los títulos de la otra

**No estaba en el plan: apareció al probar 13.1.** Con el alias ya arreglado se
importó un padrón en Tucumán y el resultado fue *"6 títulos actualizados, 0
nuevos"* — en una zona que estaba vacía. La importación había encontrado los
títulos de **Salta**.

`importarPadron` buscaba los títulos así:

```ts
const titulosExistentes = await db.titulo.findMany({
  where: { numTit: { in: numTits } },   // sin zonaId
});
```

Los daba por existentes y les aplicaba el `update`, que incluye `vendedorId`. En
la base local **6 de los 9 títulos de Salta quedaron imputados a vendedores de
Tucumán**, y con datos retrocedidos al período del otro archivo. Eso no es una
molestia de pantalla: la comisión sale de las cuotas del título y de su vendedor,
así que una zona pasaba a liquidarse con la producción de la otra.

Es el mismo defecto que 13.1 —una clave única global leída por código que filtra
por zona— en el modelo que más importa. Había dos consultas sin `zonaId`: la del
preview y la de adentro de la transacción.

**Arreglo**: las dos filtran por zona. Y como `Titulo.numTit` es `@unique` global,
un número que ya existe en la otra zona tampoco se puede crear acá: en vez de
reventar recién al insertar con un choque de clave que no explica nada, la
importación lo detecta antes, lo dice en el preview y corta al confirmar
nombrando los títulos.

**Resuelto el 04/09/2026**: Balta confirmó que el número de título **no se repite
nunca** — es propio de cada contrato en todo el club. El `@unique` global se
queda como está, y el aviso pasa a significar lo que tiene que significar: si un
archivo trae números que ya están en la otra zona, ese archivo no es de la zona
activa.

### ✅ Fase 14 — La red que impide que vuelvan

Hoy hay 149 tests de lógica pura y **cero** verificación de pantalla: Playwright
está instalado pero sólo saca capturas.

#### 14.1 Un comando que arma el escenario de las dos zonas

Armar la base de prueba son hoy siete pasos manuales, y sólo existe para Salta.
`prisma/seed.ts` siembra dos zonas y dos admins, nada más.

`scripts/sembrar-demo.ts` deja el escenario completo de una: los padrones de prueba
de **las dos zonas** importados por el camino real, las fichas de Balta y de Pedro
en cada zona enlazadas a sus cuentas, **un vendedor con cuenta de ingreso** —hoy
imposible: probar ese lado necesita una contraseña que no está en el repositorio—,
la escala de ejemplo y el contrato de agencia.

`generar-padrones-prueba.ts` gana un parámetro de zona y un juego `TT-000x` / DNI
`9998000x` para Tucumán, distinto del `PT-000x` / `9999000x` de Salta, para que se
distingan de un vistazo. Los alias de Pedro se cargan en las dos zonas: es la
contraprueba de 13.1 y falla ruidosamente si esa migración no está.

#### 14.2 Tests de los tres parsers de Excel

`parsePadron.ts` (260 líneas), `parseLeads.ts` (161) y `parsePrecios.ts` (158) son
funciones puras y **no tienen un solo test**. `parsePadron` es la puerta de entrada
de todos los datos del sistema y hoy sólo se verifica de punta a punta con
`verificar-padron.ts`, que necesita base, un Excel real y la zona SALTA hardcodeada.
Los otros dos no se verifican de ninguna forma, y no hay ni un fixture de leads o
de precios en el repositorio.

Los casos que importan salen de las reglas ya documentadas: fechas como serial de
Excel, `FchPago` vacío contra columna ausente (la distinción que borraba el email de
toda una zona), `normalizarNomVen`, `columnasPersonales`, filas con error, y
`claveTelefono` en leads. Los fixtures se arman con SheetJS en memoria
(`lib/excel/hoja-de-prueba.ts`), como hace `generar-padrones-prueba.ts`: sin
binarios versionados. Un `.xlsx` en el repositorio no se lee en un diff, nadie
sabe qué caso cubre y hay que abrir Excel para cambiarle una columna.

**Los tests encontraron un defecto el primer día.** `"$ 250.000"` se importaba
como **$250**: `Number("250.000")` da 250 en JavaScript, porque lee el punto como
decimal. Un plan de doscientos cincuenta mil pesos entraba como uno de doscientos
cincuenta, y así se guardaba en `PlanPrecio`. El código ya intentaba manejar el
formato local —`1.234.567,89` lo leía bien— pero el caso sin decimales, que es
como se escribe una lista de precios acá, quedaba afuera.

El arreglo es `lib/excel/numero.ts`, una regla sola para los tres archivos: si
hay coma, la coma es el decimal y los puntos son miles; si no hay coma, un punto
seguido de **exactamente** tres dígitos separa miles —un precio con tres
decimales no existe en pesos— y con una o dos cifras es decimal. `parsePadron`
tenía el error simétrico: quitaba todos los puntos siempre, así que un importe
guardado como texto `"1234.56"` entraba como `123456`. Ahí casi nunca se dispara
—el padrón se lee con `raw: true` y los importes llegan como número— pero era el
mismo agujero mirando para el otro lado.

#### 14.3 Un guion que verifica los permisos y el aislamiento de zonas

Es lo que fija los arreglos de la Fase 13 para siempre, y es el tipo de prueba que
menos se rompe al cambiar la interfaz, porque mira códigos de respuesta y
redirecciones y no textos.

`scripts/qa-permisos.ts` usa el molde de `capturas.mjs` —que ya resuelve lo
difícil: login por `POST /api/auth/callback/credentials` en vez de llenar el
formulario, y la cookie de zona seteada a mano— y devuelve `process.exitCode` como
`verificar-padron.ts`. **Va en TypeScript y no en `.mjs`** como decía el plan:
necesita leer la base para descubrir los ids con los que prueba el cruce entre
zonas y para apagar y volver a encender permisos, y así queda igual que
`verificar-padron.ts`, que es el otro script apto para CI.

Las 35 comprobaciones, en diez bloques: sin sesión no se ve nada y se recuerda a
dónde iba; el vendedor rebota de las seis secciones de `/admin` y ponerse la
cookie de zona no lo mete; cada permiso apagado cierra su pantalla y no sólo su
ítem del menú; una cuenta desactivada y un vendedor dado de baja salen por
`/api/salir` en el acto; el admin recibe 404 en las cinco pantallas de detalle de
la otra zona **y 200 en las mismas parado en la zona correcta** —que es lo que
prueba que no es que Tucumán no exista—; una zona inexistente en la cookie manda
al selector; el adjunto ajeno da 404 y sin sesión 401; el login no lleva afuera; y
ningún título quedó imputado a un vendedor de otra zona, que es el defecto de la
Fase 13 mirado desde los datos.

De paso, `capturas.mjs` recorría 11 pantallas de admin y **ninguna del vendedor**:
pasa a 23, con las cuatro del vendedor en su propia sesión, el laboratorio, la
comisión del agente y su escala, el perfil y las tres fichas de detalle (cuyo id
sale del primer link del listado, porque depende de lo que haya cargado). Es donde
el chequeo de desborde tenía más para encontrar, porque son las que nunca se
midieron: ninguna se sale.

### ✅ Fase 15 — El recorrido humano, en las dos zonas y con los dos roles

Lo que no se puede automatizar sin volverlo frágil: que las pantallas se
**entiendan**, que los números den y que el celular sirva. La última del plan de
QA, y la que se hizo caminando el sistema en vez de leerlo.

Se recorrieron las **catorce pantallas de administración** con las dos cuentas en
las dos zonas —cincuenta y seis combinaciones—, las **fichas de detalle** de
cliente, vendedor, venta y comisión, los formularios de alta y edición, y **el
lado del vendedor** con sus tres permisos apagados de a uno. Los números de las
guias ya validadas se comprobaron uno por uno.

#### Lo que salió bien, para no volver a mirarlo

- **Los números dan en las dos zonas.** Salta: $ 105.000 y $ 38.000 de equipo,
  $ 564.000 del club sobre 54 cuotas, 3 contratos de 100, una caída parcial y un
  título sin datos suficientes. Tucumán: $ 150.000 y $ 207.000, $ 954.000 sobre
  30 cuotas, 2 contratos de 50.
- **La ficha del agente es la de la zona activa.** Pedro ve $ 207.000 en Tucumán
  y $ 0 en Salta con la misma cuenta y la misma pantalla: es
  `getVendedorDelAdmin()` resolviendo por zona, probado con datos y no leyendo el
  código.
- **El circuito de la venta cierra.** El vendedor la carga desde su pantalla,
  pasa por el resumen, queda en su ficha, aparece en su listado, en el del admin
  y en el feed de Actividad —a nombre suyo, con Balta como actor cuando la carga
  Balta—. Es la primera vez que se prueba entero.
- **Los tres permisos hacen las dos cosas.** Apagar uno saca su ítem del menú
  —y el botón de *Nueva venta*, y la tarjeta de comisión— y además cierra la
  pantalla si la URL se escribe a mano, que es lo que ya fija `npm run qa`.
- **Lo que ve el vendedor coincide con lo que ve Balta.** Los $ 105.000 de su
  dashboard son los mismos $ 105.000 de `/admin/comisiones`, con el mismo desglose
  por número de cuota.
- **Las 23 pantallas entran en el celular**, en las dos variantes, sin que nada se
  salga por el costado.

#### Los tres defectos que encontró el recorrido

**15.1 Las fechas se mostraban en UTC.** Una venta cargada a las nueve de la
noche figuraba **con la fecha del día siguiente**, y una del último día del mes
caía en el mes que viene. Se vio al cargar una venta de prueba a las 21:24: el
listado la mostró al día siguiente. El sistema tiene dos clases de fecha y las
estaba formateando con la misma regla: un **instante** (cuándo se cargó la venta,
cuándo se importó el padrón) y un **día del padrón** (la emisión, la fecha de
pago), que no tiene hora y se guarda a medianoche UTC. Para el segundo, UTC es lo
correcto; para el primero, es falso.

La misma pasada destapó algo peor en `/admin/padron`: la hora de cada importación
salía de `toLocaleString("es-AR")`, que **no pone a. m. ni p. m.**, así que las
tres de la tarde se leían como las tres de la mañana. Y al no llevar zona escrita
dependía de la del servidor: en la máquina de desarrollo se veía bien y en
Railway —que corre en UTC— se habría visto mal, que es la peor forma de tener
este error.

El arreglo son tres funciones en `lib/formato.ts` con la zona escrita:
`dia()` y `momento()` para instantes, `diaDelPadron()` para lo que viene del
archivo. Están testeadas con el caso que lo destapó —la venta de las nueve de la
noche— y con el simétrico, que muestra que formatear un día del padrón en hora de
acá lo correría un día para atrás.

**15.2 El laboratorio invitaba a importar el padrón en la zona equivocada.**
Listaba los catorce archivos de prueba seguidos y numerados —siete de Salta y
siete de Tucumán, mezclados— bajo la instrucción *"importar los archivos en
orden, del 1 al 14"*, en una pantalla que arriba dice *"Qué hay cargado en
SALTA"*. Seguir esa instrucción al pie es exactamente el error que la Fase 13
aprendió a frenar. Ahora muestra sólo los de la zona activa y dice cuántos hay de
las otras y por qué no van acá. La convención de nombres quedó en
`lib/padron/padrones-prueba.ts`, con tests, y la usan el laboratorio y el
generador: antes vivía sólo dentro del script y la pantalla no tenía forma de
leerla.

**15.3 Los padrones abandonados se acumulaban sin vencimiento.** Subir un archivo
a importar lo deja en `uploads/tmp` hasta que se confirma; quien cierra la
pestaña en la previsualización no pasa por el borrado y su archivo queda. Había
**82** —y ya estaban anotados como 74 dos días antes—. No es basura en disco: son
**padrones reales**, con nombre, DNI, domicilio y teléfono de miles de clientes,
guardados sin dueño en el volumen persistente. Ahora caducan a las 24 horas y se
barren al guardar el siguiente, sin proceso aparte.

#### La falsa alarma que vale documentar

Cuatro pantallas que existen —editar cliente, editar venta, la escala del agente
y el detalle de comisión— devolvieron **404** de forma consistente. No era un
defecto: dos `next dev` se habían pisado sobre el mismo `.next` y el que sobrevivió
quedó con el árbol de rutas a medias. Con un servidor limpio dan 200. Queda
anotado en `CLAUDE.md` porque el síntoma no se parece en nada a la causa.

#### Lo que queda anotado

- **`Actividad` sin `vendedorId`**: los movimientos que registra un admin sobre un
  lead sin vendedor asignado sólo se ven sin filtrar. Se ve en el feed de Salta.
- **HEIC en iPhone**: el `accept` no lo nombra a propósito, así que iOS convierte
  a JPEG. Si alguna vez manda un HEIC crudo, el arreglo es el mensaje de error.
- **El modo oscuro no tiene interruptor**: sigue la preferencia del sistema.
- **`app/admin/prototipo-formulario-venta/`**: sin versionar, de Lisandro.
- **Un plan de prueba con código `007` y nombre "codigo invalido"** quedó en el
  catálogo de una prueba vieja. No molesta y se da de baja desde `/admin/planes`.

---

## Cuarta tanda (07/09/2026) — El módulo del vendedor

Con el QA terminado se abre lo que Lisandro quería abrir desde el principio. Hoy
el lado del vendedor son **9 archivos y 1.726 líneas** contra los **36 y 7.834**
del admin, y tres ítems de menú.

Lo primero que hay que decir es que **el pedido original de Balta ya está
construido casi entero**. `docs/info.txt` dedica siete renglones al vendedor
—leads con sus datos y su estado, carga de ventas, edición con historial,
dashboard con leads, ventas, cuotas cobradas, ganancia y cierre de mes— y todo
eso existe. Así que esta tanda no sale de esa lista: sale de mirar el sistema con
un padrón real en la cabeza y encontrar tres huecos que sólo aparecen con uso.

**1. El vendedor no ve un solo dato del padrón.** `Titulo.vendedorId` existe y
está indexado, pero ninguna consulta de `app/vendedor/` lee `Titulo`. El vendedor
no sabe cuáles de sus títulos están al día, cuáles se cayeron ni a quién tiene que
llamar — y las caídas se construyeron justamente para eso: *"la caída no genera
contracargo y no toca ninguna comisión: es información, para saber a quién
llamar"*. Hoy esa información la tiene sólo Balta. Tampoco ve de dónde sale su
comisión: ve el total, no los títulos que lo produjeron.

**2. `puedeVerComision` es el único permiso sin pantalla propia.** No gatea
ninguna ruta: sólo esconde bloques del dashboard. El vendedor ve el mes actual y
una línea del anterior, sin histórico ni selector de período — lo que el admin sí
tiene en `/admin/comisiones/vendedor/[id]?periodo=`.

**3. Los listados no paginan ni buscan.** `/vendedor/leads` y `/vendedor/ventas`
traen **todo sin `take`**. Con el escenario de prueba no se nota; con el padrón
real —Pedro solo aparece con 254 filas— sí. Los cuatro listados del admin ya
paginan de a 50.

### La decisión sobre "solo admin ve clientes"

`docs/info.txt` dice, en el renglón 3.1 del lado admin: *"solo admin ve
clientes"*. Abrirle la cartera al vendedor toca ese pedido, así que se le
preguntó a Lisandro antes de planificarlo. **Lo aprobó el 07/09/2026**, con el
alcance recortado: el vendedor ve **sólo sus títulos**, nunca la cartera ajena ni
el padrón completo. La frase de Balta se respeta en su espíritu —nadie se asoma a
lo que no es suyo— y además se agrega el permiso `puedeVerCartera`, para que Balta
pueda apagarlo por vendedor si prefiere la lectura literal.

### ✅ Fase 16 — Mi cartera

Commit `00dd9b2`. Migración `20260907134104_permiso_cartera`.

Sus títulos del padrón: quién le está pagando y quién no.

**La unidad es el título, no el cliente.** El listado del admin es por `Cliente` y
sus filtros de caída miran los títulos de cada uno. Copiarlo sería un defecto: un
cliente puede tener un título de este vendedor y otro de otro, y "caída total" del
cliente incluiría títulos ajenos. Se lista `Titulo` filtrando por `vendedorId` **y**
`zonaId` —los dos, aunque la ficha del vendedor ya sea por zona, porque toda
consulta de títulos lleva `zonaId`—, y el estado que se muestra es el del título:
al día · en riesgo · caído · sin datos suficientes.

- **`/vendedor/cartera`** — buscador por nombre, DNI y número de título, filtros
  por estado de caída y paginación de a 50, con el patrón de
  `app/admin/clientes/page.tsx`. Tabla en escritorio, tarjetas en el celular, y el
  teléfono como `tel:`, porque el uso real de esta pantalla es llamar.
- **`/vendedor/cartera/[id]`** — la ficha del título: contacto del cliente, plan,
  en qué cuota va, el histórico de cuotas con importe y fecha de pago, y el estado
  de caída explicado. Alcance por `findFirst({ id, vendedorId, zonaId })`.

No se ofrece editar al cliente: eso es del admin y queda así. La pantalla dice a
quién avisar si un dato está mal.

**El permiso.** Ninguno de los tres actuales cubre esto, así que se agrega
`puedeVerCartera`, en `true` por defecto como los otros: los permisos se sacan, no
se dan. Toca el schema y su migración, `lib/sesion.ts`, `lib/navegacion.ts`, el
checklist de `/perfil`, los switches de `/admin/vendedores/[id]` y
`scripts/qa-permisos.ts`, que gana la comprobación de que apagarlo cierra la ruta
además de esconder el ítem.

### 🔨 Fase 17 — Mi comisión

Commit `PENDIENTE`.

Cierra el único permiso sin pantalla y contesta lo que el vendedor pregunta todos
los meses: cuánto cobro y por qué.

`/vendedor/comision`, con `requirePermiso("verComision")` y su ítem de menú. **No
se escribe cálculo nuevo**: `obtenerLiquidacionVendedor` y `cuotasDelPeriodo` son
los mismos que usan la pantalla del admin y el dashboard. Es la razón de ser de la
pantalla: sirve para que el vendedor pueda discutir un peso, y no serviría si su
total saliera de otra cuenta que el que le pagan. El alcance sale de la sesión,
nunca de la URL —el admin recibe el vendedor por `[id]` porque mira a otros; acá
el único id posible es el propio—, y lo único que viaja por query es el período.

Muestra los renglones por número de cuota, la tabla de cuotas que entraron
—título, cliente, importe, fecha de pago, si comisiona o no por el tope— y los
datos del cálculo. Tres diferencias deliberadas con la pantalla del admin: los
gastos de representación se ven pero no se editan; **no** se muestra el nombre de
la escala, que es una decisión interna de Balta y no un dato del vendedor; y cada
título linkea a su ficha de la cartera, que es lo que convierte el número en algo
verificable.

**`periodosConMovimiento` no servía y estaba muerta.** El plan decía reutilizarla
para el selector de meses, pero al ir a usarla aparecieron dos cosas: no la
llamaba nadie —se escribió en la Fase 8 y nunca se conectó— y mira toda la zona,
así que le habría ofrecido al vendedor meses en los que cobró otro y él no. Un mes
que se abre en cero no es un dato suyo. La reemplaza `periodosDelVendedor`, que
además une **dos** fuentes: los meses con cuotas detectadas y los que ya tienen
`ComisionPeriodo`. Con una sola se escondía justo el mes en curso, que está en
borrador y todavía no tiene registro guardado.

**El link a la cartera se dibuja sólo con `verCartera`.** Si Balta le apagó la
cartera, el título deja de ser link en vez de mandarlo a un rebote silencioso. Es
exactamente el defecto que la Fase 18 tiene anotado para el botón "Cargar venta"
de la ficha del lead: la seguridad está bien, lo que está mal es ofrecer algo que
no se puede dar. Acá no se repitió, y `npm run qa` lo fija.

**En el celular los renglones no son una tabla.** Cinco columnas en 390px dejaban
la columna *Comisión* cortada contra el borde — justo la que se vino a mirar. Se
vio en la captura móvil, no leyendo el código. Va el mismo patrón que los
listados: lista abajo de 768px, tabla arriba, con el renglón escrito igual que el
del dashboard para no estrenar otro formato.

### Fase 18 — Los listados a escala

Lo que hoy funciona sólo porque la base de prueba es chica.

- **Paginación y buscador** en Mis leads y Mis ventas, con el mismo `POR_PAGINA` y
  el mismo patrón de `searchParams` del admin.
- **Filtro por estado en Mis ventas** (activa / anulada), que hoy no existe.
- **El botón "Cargar venta" de la ficha del lead se dibuja sin chequear
  `cargarVentas`**: el vendedor sin ese permiso lo ve y la pantalla destino lo
  rebota en silencio. La seguridad está bien; lo que está mal es ofrecer algo que
  no se puede dar.
- **Los dos `db.venta.count` del dashboard se ejecutan sin `cargarVentas`**, aunque
  las tarjetas que los usan no se rendericen. Es el criterio que ya se aplicó a los
  leads y a la comisión.
- Las pantallas nuevas se suman a `scripts/capturas.mjs`, en las dos medidas.

### Lo que queda afuera, y por qué

- **`Venta.tituloId` no lo escribe nadie**, así que la ficha de una venta siempre
  dice *"todavía no apareció en el padrón"*. Atarla al título por `numeroTitulo` /
  `nroSuscripcion` cerraría el circuito —el vendedor vería su propia venta ya
  cobrando—, pero eso se hace **dentro de la importación**, que es la regla más
  delicada del sistema. Es una fase propia con su propia tanda de tests.
- **Copa challenger** y **exportar la liquidación**: Balta dijo que la primera no
  era prioritaria y la segunda no la pidió nadie todavía.
- **Los porcentajes reales de la escala** siguen sin cargar. Hasta que Balta los
  cargue, todo lo que muestren estas tres pantallas es el escenario de
  `npm run demo`.

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

### Fase 7 — Que el CRM funcione desde el celular

**Preparación**

```bash
npm run dev
ngrok http 3000        # en otra terminal
```

ngrok imprime una URL `https://algo.ngrok-free.app`. Esa es la que se abre en el
teléfono. Si el túnel no es ngrok —o se entra por la IP de la máquina en la red
de casa—, hay que nombrar ese host antes de levantar el server:

```bash
ORIGENES_DEV=192.168.0.15 npm run dev
```

**1. El logo** — *esto es lo nuevo*

En el escritorio, arriba de todo en la barra lateral oscura: la "S" roja y verde
sobre un círculo blanco, con **Club San Jorge / Agente Mercantil** al lado.
Donde antes decía `CSJ` sobre un círculo rojo y *Administración*. Tiene que verse
también en `/login`, y en el panel del celular.

**2. El hamburguesa y el perfil, desde el celular** — *esto es lo que estaba roto*

Abrir la URL de ngrok en el teléfono y entrar con
`balta@crm-csj.local` / `CambiarEstePassword123`.

- Tocar el **botón hamburguesa** (arriba a la izquierda): tiene que abrirse el
  panel oscuro con el logo y la lista de secciones. Antes no pasaba nada.
- Tocar **Clientes** en ese panel: tiene que navegar **y cerrarse el panel**. Es
  el segundo bug que apareció probando el primero: antes navegaba con el menú
  tapando la pantalla.
- Volver a abrir el panel y tocar **Clientes otra vez**, estando ya en Clientes:
  tiene que cerrarse igual, aunque la ruta no cambie.
- Tocar el **desplegable de perfil** (arriba a la derecha): tiene que abrirse el
  menú con "Mi perfil", "Cambiar de zona" y "Cerrar sesión".
- **Cerrar sesión y volver a entrar.** Esto ejercita una server action, que es el
  otro camino que un túnel puede romper y que no se nota mirando la pantalla.

Si algo de esto sigue muerto, el dato que sirve está en la terminal del server:
buscar `Blocked cross-origin request` y ver qué host nombra. Ese host va en
`ORIGENES_DEV`.

**3. Que no se corra para el costado** — *esto es lo nuevo*

Desde el celular, recorrer las pantallas e intentar arrastrar la página hacia los
lados. No se tiene que mover. La que estaba rota era **Comisiones**: tres botones
en el encabezado que sumaban 458px sobre una pantalla de 390. Ahora bajan de
renglón.

**4. El chequeo automático**

```bash
CAPTURA_MOVIL=1 npm run capturas
```

Al final tiene que decir **"Ninguna pantalla se sale por el costado"**. Si alguna
se sale, lo dice con la ruta, cuántos píxeles sobran y qué elemento lo causa.

El chequeo apaga el `overflow-x: clip` de `globals.css` antes de medir, a
propósito: esa regla existe para que un desborde no arrastre la página, pero
dejaría el chequeo ciego. La red tapa el problema en pantalla; el chequeo lo
muestra igual.

**5. Que el header siga pegado arriba**

Es lo único que `overflow-x: clip` podría haber roto (con `hidden` se rompe
seguro). En cualquier pantalla larga —Clientes sirve—, bajar scrolleando: la
barra con la zona y el perfil tiene que quedarse arriba.

**Borrar los datos de prueba**

No hay nada que borrar: esta fase no carga datos.

### Fase 8 — Tres arreglos chicos

Todo desde el escritorio, con la aplicación levantada (`npm run dev`) y entrando
como `balta@crm-csj.local`.

**1. El aviso que salía solo** — *el que se veía cada vez que abrías una ficha*

Entrar a **Vendedores** y abrir uno que **no tenga cuenta de ingreso** —en la
base de desarrollo sirven `PRUEBA VENDEDOR UNO`, `PRUEBA VENDEDOR DOS` o
`PEREZ ANA (prueba)`—. Al abrir la ficha **no tiene que aparecer ningún aviso**.
Antes salía un *"Cuenta creada. Ya puede ingresar al sistema."* de la nada.

Ahora crear la cuenta ahí mismo, abajo de todo, en **Cuenta de ingreso**: poner
un email (`prueba-fase8@crm-csj.local` sirve) y una contraseña de 8 caracteres o
más. Al guardar, **el formulario se reemplaza por la cuenta creada**, con su
email y los botones de cambiar contraseña, cambiar email y suspender el acceso.

> Ese cambio en pantalla **es** el aviso, y por eso no hay toast: la ficha se
> vuelve a dibujar y el formulario deja de existir, así que un toast lanzado
> desde ahí no llegaría a verse nunca (está explicado en el archivo).

Probar también el error: en **otro** vendedor sin cuenta, poner un email que ya
exista (`balta@crm-csj.local`). Tiene que decir **"Ya hay una cuenta con ese
email."** justo debajo del campo. Antes decía *"Datos duplicados."*, que no
dice cuál — y lo mismo pasaba con el DNI y el código repetidos al cargar un
vendedor.

**2. Editar un plan** — *esto no existía*

Ir a **Planes**. Cada fila tiene ahora un botón **Editar** a la derecha. Entrar a
`Plan Auto 330` y:

- Ver que **Código de producto** está gris y no se deja escribir, con la razón
  abajo: es con lo que la lista de precios encuentra el plan.
- Cambiarle el nombre a `Plan Auto 330 (editado)` y poner **Estado: Inactivo**.
- Guardar. Vuelve al listado y la fila queda atenuada, con el nombre nuevo y el
  cartelito **inactivo**.

Ahora comprobar que el archivo de precios no lo pisa, que es el punto del
cambio. Con un editor de texto, guardar esto como `precios.csv`:

```
Codigo,Descripcion,Precio,Meses
045,NOMBRE QUE VIENE DEL EXCEL,123456,330
```

Subirlo por **Planes → Cargar precios** y confirmar. Al volver al listado:

- el nombre sigue siendo **el editado** y el plan sigue **inactivo** — antes cada
  importación devolvía el nombre del archivo y volvía a activar el plan;
- el **precio sí cambió** a `$ 123.456`, que es lo que el archivo tiene que
  hacer.

Y como el plan quedó inactivo, en **Ventas → Cargar venta** ya no aparece en la
lista de planes.

**3. El código de agente** — *esto no existía*

Ir a **Mi perfil** (desde el menú de arriba a la derecha). En *Datos de contacto*
hay un campo nuevo, **Código de agente**, sólo para las cuentas de
administración. Escribir el código del club, guardar —sale *"Datos
actualizados."*— y verlo en la tarjeta **Tu cuenta**, abajo de la zona.

> Está guardado en la cuenta, no en la zona: es el mismo en Salta y en Tucumán.
> Si en realidad el club le da un código distinto por zona, avisá, porque
> entonces el lugar es otro (ver Pendientes).

**Borrar los datos de prueba**

Volver a poner el nombre y el estado del plan como estaban (`Plan Auto 330`,
Activo) desde la misma pantalla de edición, y borrar la cuenta de prueba desde
la ficha del vendedor. El precio de `123456` queda como una fila más del
histórico del mes; si molesta, `npx prisma studio` → `plan_precios`.

### Fase 9 — Padrón: varios archivos y un selector que se entienda

Con la aplicación levantada (`npm run dev`), entrando como `balta@crm-csj.local`
en la zona **Salta**. Hacen falta los 7 archivos de `docs/padrones-prueba/`; si
no están, se regeneran con `npx tsx scripts/generar-padrones-prueba.ts`.

> Esta prueba **vacía el padrón de Salta y lo vuelve a cargar**. Es lo que hay
> que hacer para que valga: la gracia del cambio es que subir los 7 de una vez
> dé exactamente lo mismo que subirlos de a uno.

**1. Cómo se ve ahora el selector**

**Padrón → Importar padrón**. En vez del casillero gris de siempre hay un
recuadro punteado que dice **"Elegí los padrones o arrastralos acá"**. Se puede
clickear en cualquier parte y también arrastrar archivos encima. El botón de
abajo está apagado hasta que haya algo elegido.

Arrastrar (o elegir) **los 7 padrones de una vez**, y a propósito **en
desorden**. Tienen que aparecer los 7 listados con su nombre y su peso, cada uno
con una **X** para sacarlo, un **Agregar más archivos** debajo, y el botón
principal ahora dice **Analizar 7 archivos**.

Probar la X en uno cualquiera: desaparece de la lista y el botón pasa a decir
**Analizar 6 archivos**. Volver a agregarlo con **Agregar más archivos** (no hace
falta volver a elegir los otros seis, que es justamente lo que antes no se
podía).

**2. Vaciar Salta**

Antes de importar: **Laboratorio → Vaciar el padrón de SALTA**, escribiendo
`SALTA` para confirmar. Tiene que avisar que borró **8 clientes, 9 títulos, 69
cuotas y 7 importaciones**.

**3. El orden, antes de confirmar**

Volver a **Padrón → Importar padrón**, elegir los 7 en desorden y apretar
**Analizar 7 archivos**. La pantalla siguiente tiene que mostrar
**"7 padrones, en este orden"** y la lista **numerada del 1 al 7**, ordenada por
el mes de cada archivo y **no** por el orden en que se eligieron:

| # | Archivo | Meses | Filas |
|---|---|---|---|
| 1 | padron-prueba-01-2026-06 | abril, mayo, junio de 2026 | 18 |
| 2 | padron-prueba-02-2026-07 | mayo, junio, julio | 17 |
| 3 | padron-prueba-03-2026-08 | junio, julio, agosto | 19 |
| 4 | padron-prueba-04-2026-09 | julio, agosto, septiembre | 24 |
| 5 | padron-prueba-05-2026-10 | agosto, septiembre, octubre | 24 |
| 6 | padron-prueba-06-2026-11 | septiembre, octubre, noviembre | 24 |
| 7 | padron-prueba-07-2026-12 | octubre, noviembre, diciembre | 27 |

Debajo, el cartel **"Las cifras de cada archivo se ven al terminar"**. Es a
propósito: no se pueden calcular antes sin mentir, porque el segundo padrón se
mide contra una base que todavía no tiene importado el primero.

**4. Importar y controlar los números**

**Confirmar e importar los 7**. Al terminar tiene que decir **"7 de 7 padrones
importados"** y mostrar el panel de cifras **de cada uno**, con el primero
marcado como *"Fue el primer padrón de la zona"* y el aviso final de que hay
**1 título caído**.

Estos son los números que no pueden cambiar. Si alguno da distinto, el orden de
importación se rompió:

| Dónde | Qué tiene que dar |
|---|---|
| Padrón 2 | 2 ventas nuevas |
| Padrón 4 | 1 renovación |
| **Comisiones** | `PRUEBA VENDEDOR UNO` **$105.000**, `PRUEBA VENDEDOR DOS` **$38.000** |
| **Comisiones → Comisión del agente** | **$564.000** sobre **54 cuotas**, margen **$421.000** |
| Contratos del mes | 2 ventas nuevas + 1 renovación = **3 de 100** |
| **Clientes** | 1 cliente en **caída parcial** (`PT-0007`) y 1 **sin datos suficientes** (`PT-0009`) |
| **Padrón** (histórico) | **7 filas**, una por archivo |

**5. Que subirlos dos veces no rompa nada**

Volver a subir **los mismos 7**, sin vaciar. Tiene que decir otra vez "7 de 7" y
todos los paneles tienen que quedar en **0**, salvo *"Cuotas ya cargadas"* y
*"Títulos con cambios"*. Cero clientes nuevos, cero títulos nuevos, cero cuotas
nuevas y cero recién cobradas: los números de comisión no se mueven.

**6. Un archivo solo sigue igual que antes**

Elegir **uno** cualquiera. El botón dice **Analizar archivo** (en singular) y la
pantalla siguiente es la de siempre: el panel **"Qué va a pasar si confirmás"**
con las diez cifras, y —porque ya está cargado— el cartel **"Este padrón no trae
novedades"**.

**7. Cancelar ahora cancela**

Desde esa misma pantalla, apretar **Cancelar**. Vuelve al histórico, y además
—esto no se ve— borra el archivo temporal que había quedado subido. Antes
Cancelar era un simple link y cada importación abandonada dejaba dos archivos en
`uploads/tmp` para siempre. Si querés verlo: contar los archivos de esa carpeta
antes y después.

**8. Un archivo que no es un padrón**

Elegir uno de los padrones **junto con** cualquier otro Excel que no lo sea (por
ejemplo una lista de precios). Tiene que rechazar la tanda entera nombrando al
culpable: *"no-es-un-padron.xlsx: Al archivo le faltan columnas obligatorias…"*,
y **no** guardar ningún temporal — ni siquiera del que sí estaba bien.

**9. Desde el teléfono**

La misma pantalla en el celular: el recuadro punteado ocupa el ancho, los
nombres largos se parten en dos renglones en vez de cortarse (importa: los del
club se distinguen por los últimos dígitos) y nada se sale por el costado.

**Cómo dejar todo como estaba**

La base queda con los 7 padrones cargados, que es su estado normal de
desarrollo. Si algo salió raro: **Laboratorio → Vaciar el padrón de SALTA** y
repetir el paso 3. Los archivos temporales viejos de `uploads/tmp` —74 en la
base de desarrollo, restos de importaciones abandonadas de antes de este
cambio— se pueden borrar a mano; nada los referencia.

### Fase 10 — Clientes: corregir los datos y ver la documentación

Con la aplicación levantada (`npm run dev`), entrando como `balta@crm-csj.local`
en la zona **Salta**, con los 7 padrones de prueba ya importados (que es como
quedó la base).

> Esta prueba **carga una venta y corrige un cliente de prueba**. Los dos se
> borran al final; los pasos están abajo.

**1. La ficha del cliente, como estaba**

**Clientes**, buscar `99990001` y entrar a **ANA PRUEBA**. Arriba a la derecha
hay un botón nuevo, **Corregir datos**. En "Datos de contacto" el teléfono dice
`3870000000` y no hay ningún badge.

Debajo, una card nueva: **Documentación**. Todavía dice *"No hay documentación
cargada"*, porque este DNI no tiene ninguna venta.

**2. Corregir el teléfono**

**Corregir datos**. El **DNI aparece deshabilitado**, con la explicación de por
qué (es con lo que el padrón reconoce al cliente). Cambiar el teléfono a
`3875550001` y **Guardar cambios**.

Vuelve a la ficha y ahora:

- al lado de **TELÉFONO** hay un badge **"corregido a mano"**, y en ningún otro
  campo;
- al pie de la card dice *"Un dato corregido por Baltazar Ignacio Toledo Perez
  el …. El padrón ya no lo toca."*;
- la bajada de la card cambió a *"Vienen del último padrón importado, salvo los
  corregidos a mano"*.

**3. Que el padrón no lo pise — que es de lo que se trata la fase**

**Padrón → Importar padrón**, subir de nuevo **`padron-prueba-07-2026-12.xlsx`**
y confirmar. Volver a la ficha de ANA PRUEBA:

| Qué mirar | Qué tiene que pasar |
|---|---|
| Teléfono | sigue en **`3875550001`**, con su badge |
| Domicilio, localidad, código postal | siguen siendo los del padrón |
| El resto del sistema | sin cambios: el archivo no traía novedades |

Sin este cambio, esa reimportación devolvía el teléfono a `3870000000`.

**4. Volver a tomar todo del padrón**

En el pie de la card, **Volver a tomar todo del padrón**. El badge desaparece y
la bajada vuelve a la de antes. **El valor corregido queda**: el botón saca la
marca, no revierte el dato — el padrón lo va a pisar solo la próxima vez que
traiga a este cliente. Para comprobarlo, volver a importar
`padron-prueba-07-2026-12.xlsx`: ahí sí el teléfono vuelve a `3870000000`.

**5. La documentación**

**Ventas → Nueva venta**: vendedor `PRUEBA VENDEDOR UNO`, cualquier plan, DNI
`99990001`, nombre `ANA PRUEBA`, teléfono `3870000000`, calle `CALLE FALSA 001`,
Nro Suscripción `99001`, observación cualquiera, y **una foto cualquiera como
foto del DNI**. Cargar.

Volver a la ficha de ANA PRUEBA. La card **Documentación** ahora muestra la
miniatura, **Foto del DNI**, la fecha, quién la subió y abajo *"Venta suscripción
99001"*. Al hacer click se abre el archivo.

El identificador de la venta **no es un link**: la ficha de una venta hoy es sólo
del vendedor, y un admin que entre ahí se va rebotado al dashboard. El link llega
con la Fase 11.

**6. Que el adjunto no tenga URL pública**

Copiar la dirección de la imagen (botón derecho → *Copiar dirección de imagen*;
es algo como `/api/uploads/…`) y abrirla en una **ventana de incógnito**. Tiene
que responder **401 No autorizado**, no la foto.

**7. Desde el teléfono**

Las mismas dos pantallas en el celular: la ficha y el formulario de corrección.
Nada se sale por el costado y la miniatura de la documentación no desarma la
tarjeta.

**Cómo borrar los datos de prueba**

La venta se borra desde su ficha (o queda: es una venta de prueba con DNI
`9999…`, de las que borra `npx tsx scripts/datos-prueba.ts borrar`). El cliente
vuelve solo con **Volver a tomar todo del padrón** más una reimportación de
`padron-prueba-07-2026-12.xlsx`. Si algo quedó raro: **Laboratorio → Vaciar el
padrón de SALTA** y volver a subir los 7.

### Fase 11 — Ventas: confirmar, editar desde admin, foto con la cámara

No hace falta preparar nada: alcanza con la base como está. Entrá como **admin**
y elegí **Salta**.

**1. El resumen no aparece con el formulario incompleto**

`/admin/ventas` → **Cargar venta**. Sin llenar nada, apretá **Cargar venta**
abajo. No se abre ningún cuadro: el navegador señala el primer campo que falta.
Es a propósito — no tiene sentido resumir una venta incompleta.

**2. El resumen antes de guardar** — *esto es lo nuevo*

Completá: Vendedor (cualquiera), Plan (cualquiera), **Nro Suscripción**
`998877`, **D.N.I** `99999911`, Nombre `PRUEBA FASE ONCE`, Calle
`Calle Falsa 123`, Teléfono `0387 415-1234`, Observación `PRUEBA-F11 alta`.

**Cargar venta** → se abre **¿Cargamos esta venta?** con vendedor, plan,
cliente, DNI, teléfono, **Nro Suscripción 998877** y *"sin adjuntos"*. Fijate
que muestra la suscripción y **no** un "Título" vacío: enseña el identificador
que corresponde.

Apretá **Revisar**: el cuadro se cierra y seguís en el formulario, con todo lo
que escribiste. **No se guardó nada** — comprobalo yendo a `/admin/ventas`: la
venta no está. Volvé, completá de nuevo y esta vez **Confirmar y cargar**.

**3. La ficha de la venta, desde admin** — *esto es lo nuevo*

En `/admin/ventas`, la fila de `PRUEBA FASE ONCE` ahora tiene botón **Ver** (en
el celular, la tarjeta entera es el link). Entrá.

Tiene que verse el cliente, el plan, el **vendedor** (con link a su ficha), la
documentación y el **Historial de cambios**, que dice *"La venta no se editó
desde que se cargó"*. Hasta ahora esta pantalla existía sólo para el vendedor.

**4. Editar desde admin** — *esto es lo nuevo*

**Editar** → cambiá el teléfono a `3875550011` → **Guardar cambios**. Volvés a
la ficha y abajo el historial dice **Teléfono: 03874151234 → 3875550011**, con
tu nombre y la hora. El admin edita exactamente los mismos campos que el
vendedor: no se le recortó nada.

**5. Anular** — *esto es lo nuevo*

En la ficha, **Anular**. Leé el cuadro: dice que la venta no se borra y que **no
cambia ninguna comisión** (esas salen del padrón, no de las ventas cargadas acá).

Apretá **Anular la venta** sin escribir el motivo: no deja. Escribí
`PRUEBA-F11 el cliente se arrepintió` y confirmá.

La ficha muestra la franja **Venta anulada** con quién, cuándo y el motivo; el
botón **Editar desaparece** y en su lugar hay **Reactivar**. En `/admin/ventas`
la fila queda atenuada con la etiqueta **anulada**.

Probá forzar la edición por URL: pegá `/admin/ventas/<id>/editar` en la barra de
direcciones. Te devuelve a la ficha en vez de mostrarte un formulario que no
podría guardar.

**6. Reactivar** — *esto no estaba pedido, y va explicado abajo*

**Reactivar** → confirmá. Vuelve a estar activa, el botón **Editar** regresa y
la franja desaparece. En el historial quedan los dos movimientos:
**Estado: activa → anulada** con el motivo, y **Estado: anulada → activa**.

> Anular sin vuelta atrás convertía un click equivocado en un dato
> irrecuperable. Es el mismo criterio que ya usan los períodos de comisión, que
> se cierran y se pueden reabrir. Si preferís que no exista, se saca en una
> línea.

**7. Del lado del vendedor** — *este paso lo tenés que hacer vos*

Es lo único que no pude probar solo: hace falta la contraseña de una cuenta de
vendedor y no está en el repositorio.

Entrá con una cuenta de vendedor y cargá una venta desde `/vendedor/ventas/nueva`
(DNI `99999913`, nombre `PRUEBA FASE ONCE VENDEDOR`): tiene que aparecer el
mismo resumen del paso 2, **sin** la fila de vendedor —carga siempre a su
nombre—. Después, desde admin, anulá esa venta y volvé a mirarla como vendedor:
su ficha muestra la franja **Venta anulada**, sin botón de editar y con la
indicación de pedirle a Balta que la reactive.

**8. La foto con la cámara — desde el celular** — *esto es lo nuevo*

Con el teléfono, entrá a `/admin/ventas/nueva` y bajá hasta **Documentación**.
Donde antes había un campo de archivo gris, ahora hay dos botones: **Sacar foto**
y **Elegir archivo**.

- **Sacar foto** abre la cámara directamente.
- Sacada la foto, aparece la **miniatura** con el nombre del archivo, un
  **Quitar** y los botones cambian a **Sacar otra** / **Elegir otro archivo**.
- Apretá **Cargar venta**: el resumen tiene que decir **"foto del DNI"** en
  Documentación.

En la computadora los dos botones abren el mismo selector de archivos; es
esperable, `capture` sólo significa algo en el teléfono.

**9. El link que faltaba de la Fase 10**

`/admin/clientes` → entrá a un cliente que tenga documentación cargada. Al pie
de cada adjunto, **"Venta título …"** ahora es un link y lleva a la ficha de esa
venta. Quedó pendiente en la Fase 10 porque `/admin/ventas/[id]` todavía no
existía.

**Borrar los datos de prueba**

Las ventas quedaron con DNI `99999911` y `99999913`. Se pueden dejar anuladas,
que es justamente lo que la fase agrega; si las querés borradas del todo,
pedímelo y las saco por script.

### Fase 12 — Actividad: leads + ventas, filtrable por vendedor

No hace falta preparar nada. Entrá como **admin** y elegí **Salta**.

**1. El histórico viejo sigue estando** — *esto es lo primero que hay que mirar*

`/admin/actividad`. Arriba de todo dice cuántos movimientos hay y abajo están los
que ya existían de antes: **Lead asignado** y **Estado del lead**. La tabla se
renombró y el enum cambió de valores, así que si algo se hubiera perdido en la
migración, se vería acá y en ningún otro lado.

**2. El filtro por vendedor** — *esto es lo que pediste*

Arriba hay un select con todos los vendedores de la zona y un botón **Filtrar**.
Elegí uno que tenga leads asignados y filtrá: quedan sólo sus movimientos, y el
renglón de arriba dice *"N movimientos de Fulano"*.

Volvé a **Todos los vendedores** para seguir.

**3. Los chips** — *esto es nuevo*

Debajo del select hay cuatro botones: **Todo**, **Leads**, **Ventas** y
**Clientes**, cada uno con su número. Tocá **Leads**: quedan sólo los movimientos
de lead. Los contadores no cambian al filtrar —cuentan sobre el vendedor elegido,
no sobre la familia activa— para que puedas saltar de uno a otro sin perder de
vista los números.

> Son tres familias y no un chip por tipo de evento. Con siete tipos la fila
> ocupaba tres renglones en el celular, y filtrar "sólo reactivaciones" no le
> sirve a nadie. El tipo exacto igual se lee en cada renglón.

**4. Una venta, de punta a punta** — *esto es lo nuevo*

Ahora hacé las cuatro cosas y mirá cómo van cayendo en el feed.

`/admin/ventas` → **Cargar venta**. Completá: Vendedor (cualquiera), Plan
(cualquiera), **Nro Suscripción** `997712`, **D.N.I** `99999921`, Nombre
`PRUEBA FASE DOCE`, Calle `Calle Falsa 456`, Teléfono `3870000021`, Observación
`PRUEBA-F12 alta`. Confirmá.

Andá a `/admin/actividad`. Arriba de todo:

- dice **Venta cargada** y el nombre del cliente, que **linkea a la ficha**;
- a la derecha figura **el vendedor** y abajo **"por Baltazar…"**. Son dos cosas
  distintas a propósito: la venta queda a nombre del vendedor —y el filtro la trae
  por él— pero la cargaste vos, y eso también tiene que verse.

Volvé a la venta y **Editar**: cambiale el teléfono a `3875559999`. El feed suma
un **Venta editada** con `Teléfono: 3870000021 → 3875559999`, el mismo renglón que
ya muestra el historial de la ficha.

**Anulala** con el motivo `PRUEBA-F12 el cliente se arrepintió`: aparece **Venta
anulada** con el motivo entre comillas. **Reactivala**: aparece **Venta
reactivada**.

> La reactivación no estaba en el plan. La agregué porque, sin ella, el feed
> muestra anulaciones de ventas que después figuran activas y no hay forma de
> saber qué pasó.

**5. Subir la foto del DNI también queda registrado** — *esto no estaba pedido*

Editá esa misma venta y adjuntá una foto de DNI (sirve cualquier imagen), sin
tocar ningún otro campo. Guardá.

En el feed y en el historial de la ficha aparece **Foto del DNI: vacío → archivo
adjuntado**. Antes esto no dejaba rastro en ningún lado, y es la edición más común
que hay: la foto es opcional justamente para poder cargar la venta desde la calle
y subirla más tarde.

**6. Corregir un cliente** — *esto es lo nuevo*

`/admin/clientes` → entrá a cualquiera → **Editar** → cambiale el teléfono →
**Guardar**.

En el feed aparece **Datos del cliente** con el nombre y el diff del teléfono.
Fijate que este movimiento **no tiene vendedor**: corregir datos de un cliente es
tuyo, no de nadie del equipo de venta. Por eso, si filtrás por cualquier vendedor,
desaparece.

**7. El filtro no se pierde al navegar**

Con un vendedor elegido, tocá el chip **Ventas**: la URL queda con los dos
filtros (`?vendedor=…&tipo=ventas`) y el select sigue mostrando el vendedor. Lo
mismo con Anterior/Siguiente cuando haya más de una página — antes esos botones
volvían al feed sin filtros y la página 2 mostraba otra cosa.

**8. Desde el celular**

`/admin/actividad` en el teléfono: en vez de la lista, tarjetas. Cada una es
tocable y lleva a la ficha de la venta o del cliente. El diff se ve adentro de la
tarjeta y nada se sale por el costado.

**Borrar los datos de prueba**

La venta quedó con DNI `99999921`. Se borra con:

```bash
npx tsx scripts/datos-prueba.ts borrar
```

Eso saca la venta y, con ella, sus movimientos del feed. La corrección del
teléfono del cliente **no** se deshace sola: si querés, volvé a ponerle el valor
viejo desde la misma pantalla, o apretá **"Volver a tomar todo del padrón"** en su
ficha para que el próximo padrón lo pise.

Control antes de cada commit, como siempre: `npm run lint` · `npm test` ·
`npm run build`.

### Fase 13 — Los agujeros de zona

Lo que hay que ver es que **el sistema aguante las dos zonas**. Todo se hace con
`balta@crm-csj.local` / `CambiarEstePassword123`.

Punto de partida: la base local con los 7 padrones de prueba en **Salta**
(8 clientes, 9 títulos, 69 cuotas, 7 importaciones) y **Tucumán vacía**. Si no
está así, `/admin/laboratorio` → *Vaciar el padrón*, *Crear los vendedores de
prueba*, *Cargar escala de ejemplo*, e importar los 7 archivos de
`docs/padrones-prueba/`.

**1. El nombre del padrón ahora vale por zona** — es el arreglo principal.

Cambiá a **Tucumán** (menú de arriba a la derecha → la zona). Andá a
`/admin/laboratorio` y apretá **"Crear los vendedores de prueba"**.

Antes de la Fase 13 esto era destructivo y en silencio: `PRUEBA VENDEDOR UNO` ya
existía como nombre del padrón en Salta, y como la clave era única en todo el
sistema, el alias **se lo llevaba** a la ficha de Tucumán. Salta quedaba sin
vendedor y su próxima importación imputaba las cuotas a nadie.

- En `/admin/vendedores` (Tucumán) tienen que estar los dos vendedores de prueba.
- Entrá a la ficha de **PRUEBA VENDEDOR UNO** → card **"Nombres en el padrón"**:
  tiene que decir `PRUEBA VENDEDOR UNO`, con un botón **Desvincular** al lado.
- Volvé a **Salta**, entrá a la ficha del vendedor del mismo nombre: **su alias
  sigue ahí**. Los dos lo tienen, cada uno en su zona.

El botón **Desvincular** es nuevo. Antes los alias sólo se creaban al importar y
no había forma de corregir uno mal asignado: el nombre quedaba tomado en la zona
para siempre y el padrón siguiente le seguía imputando las cuotas al vendedor
equivocado. Desvincular no toca nada de lo ya importado, sólo cambia a quién se
le imputa de acá en adelante.

**2. Un padrón de otra zona ya no pisa los títulos** — el defecto más serio, y
apareció probando el anterior.

Seguí en **Tucumán**. `/admin/padron/importar` → subí
`docs/padrones-prueba/padron-prueba-01-2026-06.xlsx` (que es un archivo de Salta)
y apretá Analizar.

Tiene que aparecer un **aviso rojo**: *"6 título(s) de este archivo ya existen en
otra zona"*, nombrando `PT-0001`, `PT-0002`… y diciendo que revises que el archivo
sea de la zona activa.

Antes, esa importación decía *"6 títulos actualizados"* en una zona vacía: había
encontrado los títulos de Salta y les había pisado el vendedor con el de Tucumán.
La comisión de una zona quedaba calculada con la producción de la otra.

- Volvé a **Salta** → `/admin/padron`: sus **7 importaciones** siguen ahí.
- `/admin/comisiones`, agosto 2026: `PRUEBA VENDEDOR UNO` **$105.000** y `DOS`
  **$38.000**, como siempre. Si esos números cambiaron, algo del padrón se cruzó.

**3. Una zona que no existe te manda a elegir de nuevo.**

Es difícil de provocar a mano (la cookie es `httpOnly`); si tenés las
herramientas del navegador abiertas, cambiá `zona_activa` a `9999` en
Application → Cookies y recargá `/admin/clientes`. Tiene que llevarte a
`/seleccionar-zona`, no mostrarte un CRM entero y vacío.

**4. El lead de una venta ya no da 404.**

Abrí una venta que tenga lead de origen en `/admin/ventas/[id]` y tocá el nombre
del lead. Antes iba a `/admin/leads/<id>`, que no existe: pantalla de error. Ahora
abre `/admin/leads` filtrado por ese nombre.

**5. El login no te lleva a otro sitio.**

Entrá a `http://localhost:3000/login?volverA=//ejemplo.com` estando deslogueado y
logueate: tenés que terminar en tu dashboard, no afuera del sistema.

**Para borrar lo de prueba**: en Tucumán, dar de baja los dos vendedores desde su
ficha (o `/admin/laboratorio` → *Vaciar el padrón de TUCUMAN* si llegaste a
importar algo). Salta no hay que tocarla.

Control antes de cada commit, como siempre: `npm run lint` · `npm test` ·
`npm run build`.

### Fase 14 — La red que impide que vuelvan

Esta fase casi no se mira: **se corre**. Lo que hay que ver es que los tres
comandos nuevos hagan lo que dicen y que el sistema quede armado en las dos zonas
sin tocar nada a mano.

**1. Un comando deja todo listo.**

```bash
npm run demo
```

Tarda menos de un minuto y tiene que terminar diciendo:

```
TUCUMAN  4 clientes · 4 títulos · 30 cuotas · 7 importaciones · 2 alias
SALTA    8 clientes · 9 títulos · 69 cuotas · 7 importaciones · 3 alias
```

**Los números de Salta son los de siempre** —8 clientes, 9 títulos, 69 cuotas—
porque su escenario no se tocó: todas las guías anteriores dependen de ellos.
Tucumán es un juego nuevo y más chico, con numeración propia (`TT-000x`, DNI
`9998000x`) porque el número de título no se repite nunca.

Corrélo **dos veces seguidas**: tiene que dar exactamente lo mismo. Es la misma
regla que rige la importación del padrón, y si duplicara algo estaría mintiendo
sobre el escenario que arma.

**2. Las cuentas.** Ahora hay una de vendedor, que es lo que faltaba para poder
probar esa mitad del sistema:

| Rol | Entrar con |
|---|---|
| Admin | `balta@crm-csj.local` · `pedro@crm-csj.local` |
| Vendedor | `vendedor@crm-csj.local` / `CambiarEstePassword123` |

Entrá como el vendedor y mirá sus tres pantallas. Es la primera vez que se puede
hacer sin crear la cuenta a mano.

**3. Las dos zonas, con sus propios números.** Como Balta, en `/admin/comisiones`
(septiembre 2026):

| | Salta | Tucumán |
|---|---|---|
| Equipo | **$143.000** | **$357.000** |
| `PRUEBA VENDEDOR UNO` | $105.000 | $150.000 |
| Comisión del club | **$564.000** (54 cuotas) | **$954.000** (30 cuotas) |
| Contratos | 3 de 100 | 2 de 50 |

Los de Salta son los de todas las guías anteriores. Que el objetivo diga 100 en
una zona y 50 en la otra es lo que hay que ver: es por zona, no del sistema.

En `/admin/comisiones` de Tucumán tiene que aparecer **Pedro Toledo** cobrando
comisión como vendedor. Es el agente vendiendo con su propia ficha, que es por
zona: entrá como `pedro@` y mirá la tarjeta *"Mi comisión del mes"* de su
dashboard en las dos zonas. En Tucumán dice **$ 207.000** y en Salta **$ 0**, y
esa diferencia es toda la prueba: la tarjeta está en las dos porque tiene ficha
en las dos, y el número sale de la ficha que corresponde a la zona activa.

**4. La verificación de permisos, sola.**

```bash
npm run qa
```

Recorre 45 comprobaciones y termina en `45 comprobaciones, todas bien.` Prueba lo
que no se puede mirar a ojo: que el vendedor rebote de las seis secciones de
administración, que apagarle un permiso le cierre la pantalla y no sólo le
esconda el ítem, que una cuenta desactivada salga del sistema en el clic
siguiente, que el admin reciba 404 al escribir a mano la URL de un cliente de la
otra zona —y 200 en esa misma ficha parado en la zona correcta—, y que ningún
título haya quedado imputado a un vendedor de la zona equivocada.

Devuelve error si algo falla, así que es lo que hay que correr antes de cada
entrega de acá en adelante.

**5. Las capturas ahora incluyen al vendedor.**

```bash
CAPTURA_MOVIL=1 npm run capturas
```

Pasa de 11 pantallas a 23: se suman las cuatro del vendedor, el laboratorio, la
comisión del agente, el perfil y las tres fichas de detalle. Tiene que terminar
con **"Ninguna pantalla se sale por el costado."** Las imágenes quedan en
`.capturas-movil/` si querés mirarlas.

**6. Los tests.**

```bash
npm test
```

De 154 a 207. Los nuevos cubren los tres parsers de Excel, que no tenían
ninguno. Uno de ellos encontró un error de verdad el primer día: una lista de
precios con `$ 250.000` se importaba como **$250**, porque JavaScript lee ese
punto como decimal. Si tenés a mano una lista de precios real, subila en
`/admin/planes/importar` y mirá que los importes entren completos.

**Para borrar lo de prueba**: `npx tsx scripts/sembrar-demo.ts --borrar`, que saca
las fichas marcadas, la cuenta del vendedor y el padrón de las dos zonas. Las
zonas, los admins y la escala quedan.

Control antes de cada commit, como siempre: `npm run lint` · `npm test` ·
`npm run build`.

### Fase 15 — El recorrido humano, en las dos zonas y con los dos roles

Esta es la única guía que se hace **mirando**, no corriendo comandos. Lo
automático ya lo cubren `npm run qa` y los tests; acá lo que se prueba es que las
pantallas se entiendan y que los números sean los de siempre. Son unos veinte
minutos.

**Preparación**

```bash
npm run dev
npm run demo     # en otra terminal, si la base no está sembrada
```

Las cuentas son `balta@crm-csj.local`, `pedro@crm-csj.local` y
`vendedor@crm-csj.local`, todas con `CambiarEstePassword123`.

---

**1. Las dos zonas, con la cuenta de Balta.** Entrá y elegí **Salta**. Mirá el
dashboard y después `Comisiones`. Cambí a Tucumán desde el menú de tu nombre
(*Cambiar de zona*) y mirá las mismas dos pantallas. Tenés que ver esto:

| | Salta | Tucumán |
|---|---|---|
| Comisiones del equipo | **$ 143.000** | **$ 357.000** |
| Comisión del club | **$ 564.000** | **$ 954.000** |
| Contratos del mes | 3 de 100 | 2 de 50 |
| Clientes | 8 | 4 |

Los de Salta son los de todas las guías anteriores. Que el objetivo diga 100 en
una zona y 50 en la otra es lo que hay que ver: es por zona, no del sistema.

**2. La segunda cuenta de administración.** Salí y entrá como `pedro@`. Tenés que
ver **lo mismo** que ve Balta —son los dos agentes y ninguno tiene datos
propios—, con una diferencia: en su dashboard de **Tucumán**, la tarjeta *"Mi
comisión del mes"* dice **$ 207.000**, y en **Salta** dice **$ 0**.

Esa diferencia es la prueba de que la ficha de vendedor es por zona: Pedro tiene
una en cada una y el sistema usa la que corresponde a la zona activa. En
`/admin/comisiones` de Tucumán aparece él mismo en la tabla del equipo, cobrando
como un vendedor más.

**3. El lado del vendedor.** Salí y entrá como `vendedor@`. Fijate que:

- No hay selector de zona: la suya es fija y el chip del header no se puede tocar.
- El dashboard dice **$ 105.000** de ganancia estimada, con el desglose por
  número de cuota. Es **el mismo número** que le muestra a Balta
  `/admin/comisiones` → *PRUEBA VENDEDOR UNO*.
- Escribí a mano `localhost:3000/admin/dashboard`: te devuelve a tu dashboard.

**4. Cargar una venta, de punta a punta.** Como vendedor, *Nueva venta*. Cargá
plan **Plan Auto 330**, suscripción `99001`, DNI `99997001`, nombre
`QA RECORRIDO PRUEBA`, domicilio y teléfono cualquiera, y una observación. Antes
de guardar aparece un **resumen**: confirmálo.

Tenés que terminar en la ficha de la venta. Después, sin cerrar sesión, mirá *Mis
ventas*: ahí está, **con la fecha de hoy**. Esto último es lo que arregló esta
fase: si la cargás de noche, antes figuraba con la fecha de mañana.

Ahora entrá como Balta en Salta y buscá esa venta en `Ventas`. Tiene que estar, a
nombre de *PRUEBA VENDEDOR UNO*. En `Actividad`, el chip **Ventas** pasa a 1 y el
renglón dice quién la cargó.

**5. Los permisos.** Como Balta, entrá a `Vendedores` → *PRUEBA VENDEDOR UNO* y
apagá **Sus leads**. Volvé a la sesión del vendedor y recargá: el ítem *Mis leads*
ya no está. Escribí a mano `localhost:3000/vendedor/leads`: vuelve al dashboard,
sin cartel. Probá lo mismo con **Sus ventas** —desaparece también el botón
*Nueva venta*— y con **Su comisión** —desaparece la tarjeta del mes—. Volvé a
encender los tres.

**6. El laboratorio, que ahora sabe en qué zona estás.** Entrá a `Laboratorio` en
Salta: la lista de padrones de prueba muestra **7**, todos sin la palabra
`tucuman`, y abajo avisa que hay otros 7 de las otras zonas. Cambí a Tucumán y
mirá la misma card: ahora son los siete `padron-prueba-tucuman-*`.

Antes listába los catorce juntos y decía *"importalos del 1 al 14"*, parado en
Salta. Seguir eso al pie es el error que la Fase 13 aprendió a frenar.

**7. El celular.** Abrí el CRM en el teléfono, o achicá la ventana por debajo de
768px. Probá el menú hamburguesa —tenés que poder navegar y que se cierre al
tocar un link—, y mirá que los listados se vean como tarjetas y no como tablas
cortadas. Las pantallas del vendedor son las que más importan: es desde donde más
se usa.

Para revisarlas todas de una:

```bash
CAPTURA_MOVIL=1 npm run capturas
```

23 pantallas en `.capturas-movil/`, y al final tiene que decir **"Ninguna
pantalla se sale por el costado."**

**8. Los números que no pueden cambiar.** Si algo de esto no da, algo se rompió:

- `/admin/clientes` en Salta: **8 clientes**, uno en *caída parcial* (GINA) y uno
  *sin datos suficientes* (HUGO, que tiene un hueco en el historial).
- La ficha de GINA: un título **caído con 9 impagas seguidas** y otro al día.
- `/admin/padron` en Salta: **7 importaciones**, la primera marcada *línea base*
  y la cuarta con **1 renovación**.
- El detalle de comisión de *PRUEBA VENDEDOR UNO*: **$ 105.000**, con las cuotas
  que pasan de c4 marcadas *"no, pasa c4"*.

**Para borrar la venta de prueba** que cargaste en el paso 4: entrá a la venta
como Balta y anulála, o corré `npx tsx scripts/sembrar-demo.ts --borrar` y después
`npm run demo`, que deja el escenario como al principio.

Control antes de cada commit, como siempre: `npm run lint` · `npm test` ·
`npm run build`, más `npm run qa` contra el build.

### Fase 16 — Mi cartera

**Preparación.** `npm run demo` (idempotente: si ya lo corriste, no hace falta).
Después `npm run dev` y entrá a `localhost:3000`.

Toda la prueba se hace con la cuenta del vendedor:

| Email | Contraseña |
|---|---|
| `vendedor@crm-csj.local` | `CambiarEstePassword123` |

**1. El ítem nuevo.** Entrá como vendedor. En el menú de la izquierda tienen que
aparecer **cuatro** ítems: Dashboard, Mis leads, Mis ventas y **Mi cartera**. En
el celular está detrás del botón de menú, igual que los otros.

**2. La tarjeta del dashboard.** En `/vendedor/dashboard`, entre las tarjetas de
arriba hay una que dice **Para llamar · 2 · títulos atrasados**, en ámbar. Tocala:
lleva a la cartera.

**3. El listado.** En `/vendedor/cartera` tienen que verse **6 títulos**, en este
orden y no en otro —primero los que hay que llamar—:

| Cliente | Título | Última paga | Estado |
|---|---|---|---|
| GINA PRUEBA | PT-0007 | — | caído · 9 impagas seguidas |
| HUGO PRUEBA | PT-0009 | — | sin datos suficientes |
| ANA PRUEBA | PT-0001 | c6 | al día |
| BETO PRUEBA | PT-0002 | c6 | al día |
| ELSA PRUEBA | PT-0005 | c108 | al día |
| GINA PRUEBA | PT-0008 | c12 | al día |

Son **6 y no 9**: los otros tres títulos de Salta son de otros vendedores y no
tienen por qué aparecer acá.

**4. Los tres chips.** `Caídos 1` · `En riesgo 0` · `Sin datos suficientes 1`.
Fijate que **HUGO cae en "sin datos" y no en "en riesgo"** aunque tenga 3 impagas:
su historial tiene un hueco, así que el sistema no afirma que sean tres y no más.
Los tres chips no se pisan entre sí, y suman los 2 de la tarjeta "Para llamar".

**5. El buscador.** Escribí `GINA` → 2 filas (sus dos títulos). Escribí `PT-0005`
→ 1 fila. Escribí el DNI `99990007` → el título de GINA.

**6. La ficha.** Tocá *Ver* en GINA PT-0007. Tiene que decir:
- arriba, el botón **Llamar** (en el celular abre el teléfono),
- **caído · 9 impagas seguidas**, *ya venía del padrón · entró en la cuota 4*,
- última cuota paga: *ninguna que hayamos visto*; el club informa **3** cuotas
  pagas; histórico conocido: **cuotas 4 a 12**,
- las 9 cuotas, todas **impagas**, de $ 100.000 cada una.

En la ficha de HUGO, en cambio, tiene que aparecer el recuadro que explica que
**no alcanza para decir si está caído**. Ese es el punto de toda la pantalla: el
sistema dice "no sé" en vez de mentir con un "al día".

**7. Que sea sólo suya.** Copiá el id de un título de la ficha de un cliente
cualquiera desde la cuenta de Balta (`/admin/clientes` → un cliente que no sea de
PRUEBA VENDEDOR UNO) y pegalo en `localhost:3000/vendedor/cartera/<ese-id>` con la
sesión del vendedor: tiene que dar **404**, no un error de permisos. La existencia
de un título ajeno tampoco es asunto suyo.

**8. El permiso.** Entrá como Balta a `/admin/vendedores`, abrí *PRUEBA VENDEDOR
UNO* y apagá el interruptor **Su cartera**. Sin cerrar la sesión del vendedor,
recargá su pantalla: el ítem del menú desaparece, la tarjeta del dashboard
también, y escribir `/vendedor/cartera` a mano lo devuelve a su dashboard.
Volvé a encenderlo.

**Datos de prueba:** ninguno nuevo. Todo sale del escenario de `npm run demo`
(DNI `9999*`, títulos `PT-*`), que se borra con
`npx tsx scripts/sembrar-demo.ts --borrar`.

Control antes de cada commit, como siempre: `npm run lint` · `npm test` ·
`npm run build`, más `npm run qa` contra el build.

### Fase 17 — Mi comisión

**Preparación.** La misma de siempre: `npm run demo` (idempotente) y `npm run dev`.
La prueba se hace casi toda con la cuenta del vendedor, y los pasos 8 y 9 con la
de Balta.

| Email | Contraseña |
|---|---|
| `vendedor@crm-csj.local` | `CambiarEstePassword123` |

**1. El ítem nuevo.** Entrá como vendedor: el menú pasa a tener **cinco** ítems
—Dashboard, Mis leads, Mis ventas, Mi cartera y **Mi comisión**—. Es el último
permiso que no tenía pantalla propia.

**2. Desde el dashboard.** La tarjeta **Ganancia estimada** ahora es tocable y
lleva a la pantalla nueva, y el bloque *Tu comisión de septiembre* tiene arriba a
la derecha un botón **Ver el detalle**. Los dos van al mismo lado: el dashboard
es el resumen, no el detalle.

**3. El total.** En `/vendedor/comision`, el **Total estimado** tiene que ser
**$ 105.000**. Es la misma cifra que muestra la tarjeta del dashboard y la misma
que le liquida Balta; el paso 8 lo comprueba del otro lado.

**4. Cómo se llega ahí.** Cuatro renglones, uno por número de cuota:

| Cuota | Cobradas | Base | % | Comisión |
|---|---|---|---|---|
| c1 | 2 | $ 200.000 | 20 % | $ 40.000 |
| c2 | 2 | $ 200.000 | 15 % | $ 30.000 |
| c3 | 2 | $ 200.000 | 10 % | $ 20.000 |
| c4 | 3 | $ 300.000 | 5 % | $ 15.000 |

Abajo: *Se cobró* **$ 900.000** y *Tu comisión por esas cuotas* **$ 105.000**.
En el celular esto no es una tabla sino una lista, porque cinco columnas dejaban
la comisión cortada contra el borde — justo la que se vino a mirar.

**5. Datos del cálculo.** A la derecha: *Ventas nuevas del mes* **2**, *Tramo*
**0 a 2**, *Cobrás hasta* **c4** y *Cuotas fuera de tope* **21 · $ 2.100.000**.
Fijate en lo que **no** está: el nombre de la escala. Cuál escala le asignó Balta
a quién es una decisión interna de la agencia; el tramo y el porcentaje sí se
muestran, porque son lo que explica el número.

**6. Las cuotas que entraron.** Abajo, **30 filas**. Las **21** que pasan c4 se
ven atenuadas y dicen *no, pasa c4*: se cobraron, pero no le comisionan. Cada
número de título es un link a su ficha de **Mi cartera** — tocá `PT-0001` y tiene
que abrir la ficha de ANA PRUEBA. Eso es lo que vuelve verificable al total: de
acá salió, ese es el cliente, esa la cuota.

**7. Los meses.** Tocá la flecha **‹**: vas a agosto de 2026, que dice *No se
cobró ninguna cuota tuya en agosto de 2026* y **$ 0**, y aparece el atajo *Ir al
mes actual*. La flecha **›** está apagada en el mes en curso: adelante no hay nada
que liquidar, porque el padrón de ese ciclo todavía no existe. (La fila *Meses con
movimiento* no aparece con el escenario de prueba: hay un solo mes cargado. Con un
padrón real es la forma de saltar a un mes de hace un año sin apretar doce veces
la flecha.)

**8. Que sea el mismo número que le liquidan.** Entrá como Balta a
`/admin/comisiones`, buscá *PRUEBA VENDEDOR UNO*: **$ 105.000**. Si estos dos
números difirieran, la pantalla del vendedor no serviría para lo único que sirve,
que es poder discutir un peso. Están atadas al mismo motor, y `npm run qa` lo
comprueba en cada corrida.

**9. El permiso.** En `/admin/vendedores` → *PRUEBA VENDEDOR UNO*, apagá **Su
comisión**. Sin cerrar la sesión del vendedor, recargá: desaparecen el ítem del
menú, la tarjeta de ganancia y el bloque del dashboard, y escribir
`/vendedor/comision` a mano lo devuelve a su dashboard. Volvé a encenderlo.

Y una más, que es la que cuida el detalle: apagá **Su cartera** —dejando la
comisión encendida— y volvé a `/vendedor/comision`. Los títulos siguen ahí pero
**dejan de ser links**, en vez de mandarlo a un rebote silencioso. Volvé a
encenderla.

**Datos de prueba:** ninguno nuevo. Todo sale de `npm run demo`.

Control antes de cada commit, como siempre: `npm run lint` · `npm test` ·
`npm run build`, más `npm run qa` contra el build.

---

## Contexto para la próxima sesión

**Dónde retomar:** Lisandro validó las **fases 12, 15 y 16 el 07/09/2026** (la 14,
el 05/09; la 13, el 04/09; la 11, el 02/09; la 10, el 01/09; las 6 a 9, el 28/08).
**Las dieciocho fases del QA están cerradas.** Del **módulo del vendedor**, la
Fase 16 (Mi cartera) está validada y la **Fase 17 (Mi comisión) está construida y
espera validación**; queda la 18 (los listados a escala), que es la última de la
tanda.

De la Fase 17, lo que hay que llevarse:

- **La pantalla existe para que el vendedor pueda discutir un peso.** Por eso no
  se escribió ni una línea de cálculo nuevo: llama al mismo motor que la pantalla
  del admin. `npm run qa` compara el total del HTML contra lo que devuelve
  `obtenerLiquidacionVendedor`, y es la única comprobación del guion que mira
  texto de pantalla en vez de códigos de respuesta — está justificada ahí y en
  ningún otro lado.
- **El alcance sale de la sesión, no de la URL.** El admin recibe el vendedor por
  `[id]` porque mira a otros; el vendedor sólo puede ser él, así que la ruta no lo
  lleva. Lo único que viaja por query es el período.
- **Lo que no se le muestra es tan deliberado como lo que sí.** El nombre de la
  escala es una decisión interna de la agencia; el tramo y el porcentaje son la
  explicación del número. Y los gastos de representación se ven pero no se editan.
- **Una función exportada que no llama nadie es una trampa, no una reserva.**
  `periodosConMovimiento` estaba escrita desde la Fase 8, sin usar, y además era
  incorrecta para lo que el plan quería (mira toda la zona, no al vendedor). Se
  reemplazó por `periodosDelVendedor` en vez de dejar las dos con nombres casi
  iguales.
- **Lo que se descubrió en la captura, no en el código:** cinco columnas en un
  celular cortaban justo la columna *Comisión*. El chequeo de "nada se sale por el
  costado" pasaba igual, porque el scroll estaba contenido en su div.

De la Fase 16, lo que hay que llevarse:

- **La cartera del vendedor lista títulos, no clientes.** Copiar el listado del
  admin —que agrupa por cliente— habría mostrado datos ajenos: un cliente puede
  tener un título de este vendedor y otro de otro, y la "caída total" del cliente
  incluiría el que no le corresponde. El filtro va por `vendedorId` **y**
  `zonaId`, y el estado que se muestra es el del título.
- **Un chip que cuenta distinto de lo que dice el badge es un defecto.** El filtro
  "En riesgo" arrancó contando también los títulos con historial incompleto, así
  que HUGO aparecía bajo "En riesgo" con el badge diciendo *"sin datos
  suficientes"*. Ahora lleva `caidaConfiable: true` y los tres chips son
  disjuntos. Es la misma regla de siempre: el sistema tiene que poder decir "no
  sé", y no puede decirlo en un lugar y afirmar otra cosa en el de al lado.
- **`puedeVerCartera` es el cuarto permiso**, en `true` por defecto como los
  otros. Existe porque Balta había pedido *"solo admin ve clientes"*
  (`docs/info.txt`): el vendedor ve únicamente sus títulos, y si Balta prefiere
  la lectura estricta lo apaga por vendedor. Lo aprobó Lisandro el 07/09/2026.
- **La pantalla se ordena por impagas descendente, no por nombre.** Es una lista
  de trabajo —a quién llamar—, no un directorio; para encontrar a alguien está el
  buscador.
- `npm run qa` pasó de 35 a **39 comprobaciones**: las dos del permiso nuevo y las
  dos de que un título ajeno da 404.

De la Fase 15, lo que hay que llevarse:

- **Un instante y un día del padrón no se formatean igual.** Se mostraban los dos
  en UTC, así que una venta cargada de noche figuraba con la fecha del día
  siguiente. Ahora hay tres funciones en `lib/formato.ts` —`dia`, `momento`,
  `diaDelPadron`— con la zona escrita, porque Railway corre en UTC y un
  formateador sin `timeZone` se ve bien en desarrollo y mal en producción.
- **Una pantalla que enseña a hacer algo mal es un defecto.** El laboratorio
  listaba los catorce padrones de prueba juntos diciendo *"importalos del 1 al
  14"*, parado en una zona. El código estaba bien y la instrucción llevaba al
  error que la Fase 13 aprendió a frenar.
- **Los temporales de la importación caducan a las 24 horas.** Se habían juntado
  82 padrones abandonados en `uploads/tmp`: no es basura en disco, son datos
  personales de miles de clientes en el volumen persistente.
- **Dos `next dev` sobre el mismo `.next` dejan al sobreviviente devolviendo 404
  en rutas que existen.** Cuatro pantallas parecían rotas y no lo estaban. Está
  en `CLAUDE.md`: el síntoma no se parece a la causa.
- **El recorrido con las dos cuentas en las dos zonas dio bien**, incluido el
  circuito completo de una venta del vendedor al feed de Actividad. Lo que no
  había sido probado nunca eran las combinaciones, no las pantallas sueltas.

De la Fase 14, lo que hay que llevarse:

- **`npm run demo` arma el escenario entero**, en las dos zonas y con una cuenta
  de vendedor (`vendedor@crm-csj.local`). Es idempotente. Antes esto eran siete
  pasos manuales por zona y sólo estaba documentado para Salta; el lado del
  vendedor directamente no se podía probar sin crear la cuenta a mano.
- **`npm run qa` corre 45 comprobaciones de permisos y aislamiento** y devuelve
  exit code. Es lo que fija los arreglos de la Fase 13 y lo que conviene correr
  antes de cada entrega.
- **El escenario de Salta no se toca nunca.** Sus números (8 clientes, 9 títulos,
  69 cuotas, $105.000 / $38.000 / $564.000) son la referencia de todas las guías
  ya validadas: agregarle un título las invalida a todas. Tucumán es un juego
  aparte, con numeración propia.
- **Los tests de los parsers encontraron un error el primer día**: `"$ 250.000"`
  entraba como `$250`, porque `Number("250.000")` da 250. La lectura de números
  quedó en `lib/excel/numero.ts`, una sola regla para los tres archivos. Vale la
  pena recordarlo antes de escribir el próximo parseo de un campo numérico.
- **Los fixtures de Excel se fabrican en memoria** (`lib/excel/hoja-de-prueba.ts`),
  nunca se versionan: un `.xlsx` en el repo no se lee en un diff y nadie sabe qué
  caso cubre.

**El plan volvió a crecer.** El 03/09/2026 Lisandro pidió, antes de abrir el
módulo del vendedor, una pasada de QA sobre todo lo construido: buscar
filtraciones y comprobar que funcione con las dos cuentas de admin en las dos
zonas. De ahí salen las **fases 13 a 15**.

De la Fase 13, lo que hay que llevarse:

- **Una clave `@unique` global leída por código que filtra por zona es un
  defecto, no un detalle.** Apareció dos veces en el mismo día:
  `VendedorAlias.nomVenPadron` trababa la importación de la segunda zona, y la
  búsqueda de títulos sin `zonaId` hacía que un padrón de Tucumán le pisara el
  vendedor a los títulos de Salta —la comisión de una zona calculada con la
  producción de la otra—. Si aparece otra clave así, revisar las dos puntas: la
  restricción y todas sus lecturas.
- **El segundo defecto lo encontró la prueba, no la lectura del código.** La
  auditoría de las 59 rutas dio limpia y ese `findMany` no saltó; se vio al
  importar de verdad en Tucumán y leer el resumen: *"6 títulos actualizados"* en
  una zona vacía. Probar en las dos zonas encuentra cosas que revisar archivo por
  archivo no encuentra.
- **`Titulo.numTit` es único global y así está bien.** Balta lo confirmó el
  04/09/2026: el número no se repite nunca, es propio de cada contrato en todo el
  club. Eso le da su sentido definitivo al aviso de la importación: si un archivo
  trae números que ya están en la otra zona, **el archivo no es de esa zona** —no
  es una colisión legítima que haya que soportar—. Y explica por qué los padrones
  de prueba de Tucumán necesitan numeración propia (`TT-000x`): con los `PT-000x`
  de Salta estaríamos simulando algo que en la realidad no pasa.
- **Los alias ya se pueden desvincular** desde la ficha del vendedor. Antes se
  creaban sólo al importar y no había forma de corregir uno mal asignado.

**El plan ya no termina en la Fase 6.** El 27/08/2026 Lisandro trajo una segunda
tanda de pedidos y quedaron planificadas las **fases 7 a 12**.

De la Fase 7 conviene recordar una sola cosa: **el bug de ngrok se reprodujo sin
celular y sin túnel**, con un proxy HTTPS local que hace de ngrok y Playwright en
viewport de iPhone resolviendo el dominio contra `127.0.0.1`. Ese armado es
reproducible en media hora si hace falta volver, pero no quedó en el repositorio:
para dejarlo había que versionar la clave privada de un certificado autofirmado.
La receta está en la guía de prueba de la fase.

De la Fase 12, cuatro cosas que valen para lo que venga:

- **`Actividad` reemplazó a `LeadActividad`** y ya registra los seis tipos de
  evento. Para sumar uno nuevo alcanza con agregar el valor al enum
  `ActividadTipo`, su renglón en `PRESENTACION` y la familia que le corresponda
  en `FAMILIAS` (`app/admin/actividad/page.tsx`), y llamar a
  `registrarActividad(tx, …)` dentro de la transacción de la acción.
- **`vendedorId` no es `actorUserId`.** El primero es a nombre de quien queda el
  movimiento y es el eje del filtro; el segundo es quién apretó el botón. Toda
  acción nueva que registre actividad tiene que decidir los dos.
- **Renombrar una tabla de Prisma se escribe a mano.** Prisma lo resuelve como
  DROP + CREATE y borra el histórico. Y un enum al que hay que agregarle valores
  se convierte con un CAST a un tipo nuevo, porque `ALTER TYPE … ADD VALUE` no se
  puede usar en la misma transacción que lo agrega y las migraciones de Prisma
  corren en una. La migración `20260902141500_actividad_unificada` es el molde.
- **Cuidado con Playwright y los `<Link>`**: al tocar un chip la navegación es del
  cliente y la URL cambia recién cuando llega el RSC, así que `networkidle` no
  alcanza y hay que esperar la URL. Lo mismo con `waitForURL(/\/admin\/ventas/)`,
  que matchea `/admin/ventas/nueva` —o sea la página en la que ya se está— y
  resuelve al instante: hay que anclar el final.

De la Fase 11, dos cosas que siguen valiendo:

- **El admin y el vendedor editan con el mismo motor** (`aplicarEdicion`), y lo
  único que cambia es el alcance. Anular marca y no borra, pide motivo y **no
  toca ninguna comisión**: esas salen del padrón.
- **Ojo con los `<a>` anidados** al hacer clickeables las tarjetas del celular:
  el listado de ventas tenía el link del DNI adentro del link de la tarjeta y
  eso rompía la hidratación de toda la pantalla.

De la Fase 10, tres cosas que valen para lo que viene:

- **El padrón ya no escribe los seis campos personales juntos.** Los que el
  admin corrigió (`Cliente.camposManuales`) y los cuya **columna no vino en el
  Excel** quedan afuera. La regla es pura y está en `lib/padron/camposCliente.ts`
  con tests; `parsePadron` devuelve `columnasPersonales` para que la
  importación pueda distinguir "vacío" de "no informado".
- **`Cliente.editadoPorUserId` y `editadoAt` ya existen**, y son lo que la
  Fase 12 necesita para registrar `CLIENTE_EDICION` en la Actividad.
- **La documentación del cliente se busca por DNI.** `Venta` no tiene FK a
  `Cliente` y `Venta.tituloId` no lo escribe nadie. El identificador de la
  venta ya linkea a `/admin/ventas/[id]`, que creó la Fase 11.

De la Fase 9, tres cosas que valen para lo que viene:

- **El orden de una tanda de padrones lo decide el período del archivo, no el
  usuario.** La regla vive en `lib/padron/tanda.ts` con tests, porque de ese
  orden salen las comisiones: al revés, una renovación queda como venta nueva.
- **`input.files` sólo se reescribe con un `DataTransfer`**, y no hay que
  vaciar el input antes de abrir el selector: si el usuario cancela el cuadro
  de diálogo, `change` no dispara y queda un formulario vacío que en pantalla
  se ve lleno. Un `<input type="file">` `required` tampoco puede ir en
  `display: none`, o el navegador no puede mostrar su aviso de "completá este
  campo". Todo eso está resuelto en `components/layout/selector-archivos.tsx`,
  que ahora usan las tres importaciones.
- **`uploads/tmp` tenía 74 archivos huérfanos** de importaciones abandonadas
  —el Cancelar era un link y no borraba nada—. Ya no se acumulan, pero los
  viejos siguen ahí y se pueden borrar a mano.

De la Fase 8, dos cosas que valen para lo que viene:

- **Un toast lanzado desde un `useEffect` no se ve si el formulario desaparece
  al revalidar.** Es lo que pasaba en el alta de cuenta del vendedor: la acción
  revalida la ficha, la ficha ya no dibuja el formulario, el componente se
  desmonta en el mismo commit y el efecto no llega a correr. Sirve tenerlo
  presente en las fases 10 y 11, que agregan varias acciones parecidas.
- **Los errores de duplicado de Prisma cambiaron de forma.** Con
  `@prisma/adapter-pg`, `error.meta.target` ya no se completa: las columnas que
  chocaron vienen en `meta.driverAdapterError.cause.constraint.fields`. Estaba
  haciendo que ningún formulario dijera qué dato estaba repetido. Arreglado y
  con tests en `lib/errores-prisma.test.ts`.

Lo que queda abierto después de las fases 6 y 7:

- **Confirmar con Balta que la observación sea obligatoria en casi toda venta
  nueva**, que es la consecuencia de las dos reglas como las definió (ver la
  Fase 6). Si no era la idea, se cambia en una línea.
- **Decidir qué pasa con el prototipo** `app/admin/prototipo-formulario-venta/`:
  borrarlo, o convertirlo en algo real si Balta quiere poder cambiar los campos
  solo. Lo segundo es una fase aparte bastante más grande.

**Cosas que conviene saber:**

- **La base de desarrollo tiene los 7 padrones de prueba importados** en Salta
  —desde la Fase 9, subidos en una sola tanda—,
  con los orígenes ya resueltos (`PT-0006` es la renovación), las caídas
  calculadas (`PT-0007` caído, `PT-0009` sin datos suficientes) y sin ningún
  período de comisión del agente guardado. Para empezar de cero, vaciar desde
  `/admin/laboratorio`.
- **El prototipo del formulario no guarda nada.** Es `useState` puro, sin
  `localStorage` ni backend: lo que se configura vive en la pestaña abierta y se
  pierde al recargar (y un hot-reload lo borra). Si hace falta volver a definir
  campos con Balta, conviene primero agregarle persistencia o pedirle una
  captura antes de tocar el archivo.
- ~~**La ficha de una venta es sólo para vendedores.**~~ Desde la Fase 11 hay
  ficha y edición en `/admin/ventas/[id]`, con el alcance puesto en la zona
  activa. Lo que sigue siendo cierto es lo inverso: **probar el lado del
  vendedor necesita una cuenta de vendedor**, y sus contraseñas no están en el
  repositorio.
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

**Lo que se descubrió al planificar las fases 7 a 12** (vale la pena tenerlo a
mano, son cosas que no se ven leyendo el código de a un archivo):

- **El padrón pisa los seis campos personales del cliente juntos**, y una celda
  vacía borra lo que había. Peor: si al Excel le falta una columna opcional
  —`Email`, `Telefono`, `Domicilio`, `CodPos` y `Localidad` no están en
  `COLUMNAS_REQUERIDAS`— ese campo se vacía en **toda la zona**. Lo arregla la
  Fase 10.
- **El Excel de precios pisa el catálogo de planes**: fuerza `nombre` y
  `activo: true` en cada import, así que dar de baja un plan a mano no sobrevive al
  archivo siguiente. Lo arregla la Fase 8.
- **`Venta` no tiene FK a `Cliente`.** Duplica `nombreCliente` y `dni` como texto,
  y `Venta.tituloId` existe en el schema pero **no lo escribe ningún código**. El
  único camino de un cliente a sus adjuntos es por DNI + zona.
- **No hay auditoría del alta de una venta.** `VentaHistorial` sólo registra
  ediciones; del alta queda `Venta.createdAt`, que dice cuándo pero no quién.
- **El admin no puede ver ni editar una venta**: `app/admin/ventas/[id]` no existe
  y `editarVenta` exige rol VENDEDOR y scopea por `vendedorId`.
- **`next.config.ts` no tiene `allowedDevOrigins` ni
  `serverActions.allowedOrigins`**, que es lo primero que hay que mirar cuando algo
  se rompe detrás de un proxy.

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

### De la segunda tanda (fases 7 a 12)

Ninguno bloquea; los tres se pueden implementar con el supuesto anotado y
corregir después si Balta dice otra cosa.

5. ~~**El texto de la marca en la barra lateral.**~~ Resuelto el 28/08/2026: el
   nombre queda como está y la bajada pasa de *Administración* a **Agente
   Mercantil** (ver [Fase 7](#-fase-7--que-el-crm-funcione-desde-el-celular)).
6. **El código de agente, ¿es uno por persona o uno por zona?** Se implementa como
   uno por persona (`User.codigoAgente`). Si fuera por zona, el lugar natural sería
   `Vendedor.codigo`, que ya lo es. — Fase 8.
7. **¿Quién puede anular una venta?** Implementado como acción sólo del admin,
   porque es destructiva. El pedido de "las mismas opciones para los dos" era sobre
   editar. — Fase 11.
8. **¿Se puede reactivar una venta anulada?** No estaba pedido y se implementó
   igual: anular sin vuelta atrás convierte un click equivocado en un dato
   irrecuperable, y el sistema ya trata así a los períodos de comisión. Si Balta
   prefiere que anular sea definitivo, se saca en una línea. — Fase 11.
9. **¿Los chips del feed tienen que ser por familia o uno por tipo?** Están por
   familia —Leads, Ventas, Clientes—: con siete tipos la fila ocupaba tres
   renglones en el celular y "sólo reactivaciones" no le sirve a nadie. Si Balta
   quiere aislar un evento puntual (las anulaciones del mes, por ejemplo), se
   agrega ese chip sin tocar nada más. — Fase 12.
10. **¿La corrección de datos de un cliente tiene que quedar a nombre de alguien
    del equipo?** Hoy no: aparece en el feed sin vendedor, así que filtrar por
    cualquiera de ellos la esconde. Es lo correcto —corregir un cliente es del
    admin— pero significa que ese movimiento sólo se ve sin filtrar. — Fase 12.

### De la tercera tanda (fases 13 a 15)

11. ~~**¿El número de título es único en todo el sistema o puede repetirse entre
    Salta y Tucumán?**~~ Resuelto el 04/09/2026: **el número de título no se
    repite nunca**, es propio de cada contrato en todo el club. `Titulo.numTit`
    se queda `@unique` global, que es lo correcto. Con eso, el aviso que agrega
    la Fase 13 —*"N títulos de este archivo ya existen en otra zona"*— pasa a ser
    lo que tiene que ser: no un caso de negocio, sino la señal de que el archivo
    que se está subiendo **no es de la zona activa**. — Fase 13.
