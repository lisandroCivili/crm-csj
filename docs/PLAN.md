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
| 0 | Balta y Pedro también son vendedores | 🔨 commit `3a06dce` |
| 0.5 | Datos de prueba auditables | 🔨 `scripts/datos-prueba.ts` |
| 0.6 | Laboratorio: base de desarrollo con datos ficticios | 🔨 `/admin/laboratorio` |
| 1 | Escalas de comisión por vendedor | 🔨 migración `20260826153914_escalas_por_vendedor` |
| 2 | Renovaciones y pestaña Padrón | ⬜ pendiente |
| 3 | Comisión del agente (Balta y Pedro) | ⬜ pendiente |
| 4 | Caídas de clientes | ⬜ pendiente |
| 5 | Gráficos del dashboard | ⬜ pendiente |
| 6 | Formulario de venta | ⬜ bloqueada — falta la lista de campos de Balta |

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

### 🔨 Fase 0 — Balta y Pedro también son vendedores

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

### 🔨 Fase 0.5 — Datos de prueba auditables

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

### 🔨 Fase 0.6 — Laboratorio: base de desarrollo con datos ficticios

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

### 🔨 Fase 1 — Escalas de comisión por vendedor

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

### ⬜ Fase 2 — Renovaciones y pestaña Padrón

Dos puntos que tocan `PadronImport`: **una sola migración para los dos**.

- Enum `TituloOrigen { VENTA_NUEVA, RENOVACION, BASE }`; `Titulo.origen` y
  `Titulo.cuotaInicial`.
- `PadronImport` gana `clientesActualizados`, `titulosActualizados`,
  `cuotasSinCambios` (hoy se calculan pero **no se guardan**), más
  `titulosNuevosVenta`, `titulosNuevosRenovacion` y `esLineaBase`.
- Regla: primera importación de la zona → todo `BASE`. Después, título que no
  existe → cuota mínima 1 = `VENTA_NUEVA`, > 1 = `RENOVACION`.
- **El cálculo no cambia**: la renovación no tiene cuota 1, así que no suma al
  tramo, y sus cuotas cobran el % de la cuota real dentro del tope. Ya funciona
  así; se cubre con un test para que no se rompa por accidente.
- `/admin/padron` muestra el mismo panel que el preview de análisis.

### ⬜ Fase 3 — Comisión del agente

Motor nuevo, hermano del de vendedores. La fase que más plata mueve.

- `EscalaAgente` (`zonaId`, `cuotaDesde`, `cuotaHasta`, `porcentaje`) cargada con
  el contrato de arriba. `ComisionAgentePeriodo` + `ComisionAgenteDetalle`,
  espejo de los de vendedor, con el mismo cierre que congela porcentajes.
- `lib/comisiones/calcularComisionAgente.ts`: función pura con tests. Recibe
  **todas** las cuotas cobradas de la zona, sin filtrar por vendedor y **sin el
  tope de c1-c5**. Aritmética en centavos, como el motor de vendedor.
- **No usa `CUOTAS_COMISIONABLES`**: esa constante llega hasta 5 y es del
  vendedor. En el padrón real, 5.482 de 6.878 filas caen fuera de c1-c5 y hoy no
  generan nada.
- Si las ventas del mes no llegan al mínimo del contrato, advertencia visible (no
  bloquea el cálculo).
- Gastos de representación: campo manual con el valor base sugerido. El ajuste
  por IPC queda **fuera de alcance** (necesita fuente externa).
- Dashboard: comisión del club, lo que se le paga al equipo, y **la diferencia**,
  que es el margen real de la agencia.

### ⬜ Fase 4 — Caídas de clientes

> **Aclaración para Balta**: el sistema no necesita "cargar 7 padrones" como
> mecanismo; necesita **7 cuotas consecutivas de histórico por título**. Como cada
> padrón trae 3 meses y se solapan, con padrones mensuales seguidos eso son unos
> 5 archivos. Lo que sí es cierto es que sin ese histórico no se puede detectar
> nada, y el sistema tiene que decirlo en pantalla en vez de mostrar cero caídas.

- `Titulo`: `impagasConsecutivas`, `caidoAt`, `cuotaUltimaPaga`, y la cobertura
  del histórico (`cuotaMinConocida`, `cuotaMaxConocida`).
- Se recalcula al importar. Script `scripts/recalcular-caidas.ts` para la primera
  pasada.
- **Si hay un hueco en la numeración, no se marca**: se informa "sin datos
  suficientes". Contrastar con `Titulo.cuotasPagas`, que viene del club.
- `/admin/clientes`: filtro `?caida=riesgo|parcial|total` y badge de estado.

### ⬜ Fase 5 — Gráficos del dashboard

- **Torta de comisiones de meses anteriores.** Balta la pidió así. Sale de
  `ComisionAgentePeriodo`, que sólo tiene los meses **cerrados** — hay que
  aclararlo para que un mes abierto no parezca que valió cero.
- **Barras: diferencia en ventas entre los últimos 5 padrones.** Sale de
  `PadronImport.titulosNuevosVenta` / `titulosNuevosRenovacion` (Fase 2).
- Reusar el patrón de `components/dashboard/cobranza-por-mes.tsx` (Recharts).

### ⬜ Fase 6 — Formulario de venta

**Bloqueada**: falta la anotación con los campos que definió Balta.

- Contrastarla con el prototipo (`app/admin/prototipo-formulario-venta/`, sin
  commitear) y con `components/ventas/venta-form.tsx`.
- Ajustar `Venta`, `ventaSchema`, `CAMPOS_HISTORIAL` y el formulario.
- Decidir qué pasa con el prototipo: si los campos quedan fijos, se borra; si
  Balta los quiere poder cambiar solo, es una fase aparte más grande.

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

- **Clientes**: 7 clientes de prueba. `GINA PRUEBA` tiene dos títulos, uno que
  paga y otro que no: es el caso de caída parcial de la Fase 4.
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

## Contexto para la próxima sesión

**Dónde retomar:** la Fase 1 (escalas de comisión por vendedor) está
construida y probada de punta a punta contra la base local; falta que
Lisandro la valide siguiendo la guía de arriba. Si da OK, sigue la Fase 2
(renovaciones y pestaña Padrón) o la Fase 3 (comisión del agente), que ya no
tienen dependencias pendientes.

**Cosas que conviene saber:**

- **Hay vendedores con datos reales en la base de desarrollo** (ej. "GOMEZ
  HUGO", código `P009`), sobrevivientes de antes de vaciar el padrón en la Fase
  0.6: vaciar el padrón borra clientes/títulos/cuotas, pero nunca vendedores.
  Si se escribe un script de verificación ad-hoc, filtrar por `codigo` (los de
  prueba empiezan con `PRUEBA-`) y no por un fragmento del nombre: buscar por
  "GOMEZ" a secas encuentra a este vendedor real en vez de al de prueba.

- **La ficha de vendedor de Balta y Pedro todavía no existe con datos reales.**
  Hasta que se cree y se enlace, `getVendedorDelAdmin()` devuelve null y la
  tarjeta "Mi comisión del mes" no aparece. Falta el DNI y el código reales
  (ver pendientes).
- **`prisma dev` deja un lock huérfano si se lo mata a la fuerza.** Si la base no
  arranca con `Lock file is already being held`, está documentado en
  `CLAUDE.md`. No hay que borrar datos, sólo un directorio.
- **`npm start` (producción) contra la base local revienta el dashboard** con
  `P1017 ConnectionClosed`: `lib/db.ts` sólo limita el pool a 4 en desarrollo y
  `prisma dev` corta a las ~9 conexiones. Para verificar, usar `npm run dev`.
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
2. **Qué es "el esquema anterior"** al que vuelve el contrato si no se llega a los
   50 contratos mensuales. Por ahora la Fase 3 sólo avisa.
3. **¿Balta tiene su propio contrato de agencia?** El que se pasó es de Pedro
   Antonio Toledo. Si los porcentajes difieren, `EscalaAgente` ya queda por zona
   y alcanza.
4. **Gastos de representación**: hoy se cargan a mano. ¿Alcanza, o quiere el
   ajuste bimestral por IPC calculado?
5. **Campos finales del formulario de venta** — bloquea la Fase 6.
6. En el padrón, Pedro aparece bajo tres alias (`TOLEDO PEDRO`, `TOLEDO PEDRO A.`,
   `TOLEDO PEDRO ANTONIO`). Con la Fase 0 hecha, esos títulos se le pueden
   imputar a su ficha de agente. Confirmar que corresponde.
