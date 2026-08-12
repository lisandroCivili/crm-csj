# Qué falta — punto de retomada

Documento de traspaso para arrancar una sesión nueva sin tener que releer todo.
El contexto del negocio está en [`../CLAUDE.md`](../CLAUDE.md); acá va solo lo
que queda por hacer.

**Estado:** rama `dev`, sincronizada con `origin/dev`.
Último commit: `f9b7e25`.

---

## 1. Las tres preguntas que bloquean la Fase 7

Son la única razón por la que las comisiones no están implementadas. **Nada más
del sistema depende de ellas.** Hay que preguntárselas a Balta.

### Pregunta 1 — ¿De dónde sale la comisión?

> ¿La comisión se liquida sobre las cuotas que figuran cobradas en el **padrón**
> que manda el club, o sobre las **ventas que cargan los vendedores** en el CRM?

Por qué importa: el padrón es el dato oficial y ya trae vendedor, cuota, importe
y fecha de pago de cada título; las ventas del CRM son el pipeline del vendedor y
pueden no coincidir. Define de qué tabla sale la materia prima del cálculo.

Las dos alternativas ya están cubiertas por el modelo:

| Si contesta… | Se calcula desde | Ya guardado en |
|---|---|---|
| "del padrón" | `TituloCuota` con `fechaPago` | `detectadaPagaAt` marca cuándo se vio pagada por primera vez |
| "de las ventas" | `Venta` vinculada a su `Titulo` | `Venta.tituloId` |

### Pregunta 2 — ¿Sobre qué monto se aplica el porcentaje?

> El porcentaje de cada cuota, ¿se aplica sobre el **importe de esa cuota**
> (la columna `Importe` del padrón), sobre el **valor nominal del plan**, o sobre
> otra cosa?

Por qué importa: cambia el resultado por un orden de magnitud. En el padrón
analizado las cuotas van de $30.800 a $190.000, mientras que un plan puede valer
más de un millón.

El campo destino ya existe: `ComisionDetalle.baseCalculo`.

### Pregunta 3 — ¿Cómo se vincula una venta con su título?

> Cuando un vendedor carga una venta, el club todavía no asignó el número de
> título. ¿Cómo se enteran de qué `NumTit` le tocó? ¿Se lo informan, o hay que
> deducirlo por DNI cuando aparece en el padrón?

Por qué importa: define si el vínculo es automático, manual o mixto. Solo hace
falta si la respuesta a la pregunta 1 involucra las ventas del CRM.

Estado actual: `Venta.tituloId` existe y es nullable, la venta guarda el `dni`
del cliente, y `Titulo` cuelga de `Cliente` que también tiene `dni` — el matcheo
automático por DNI es viable sin tocar el schema.

### Otras dos consultas menores, sin urgencia

- **Nombre completo de Pedro Toledo**, para el seed (`prisma/seed.ts` tiene el
  `TODO`). Hoy figura como "Pedro Toledo".
- En el padrón, Pedro aparece como vendedor bajo tres alias (`TOLEDO PEDRO`,
  `TOLEDO PEDRO A.`, `TOLEDO PEDRO ANTONIO`, 254 filas en total).
  **¿Esas ventas se le imputan a él como vendedor**, además de su rol de admin?

---

## 2. Fase 7 — Motor de comisiones

### Lo que ya está construido

El modelo de datos está completo y migrado. **No hace falta tocar el schema**
salvo que las respuestas traigan algo inesperado.

| Modelo | Para qué |
|---|---|
| `EscalaComision` | Tabla editable: `ventasMin`, `ventasMax`, `numeroCuota`, `porcentaje`. Cruza volumen de ventas del vendedor contra número de cuota |
| `ComisionPeriodo` | Un registro por vendedor y mes. Incluye `gastosRepresentacion` (importe manual de Balta) y `totalComision` |
| `ComisionDetalle` | Desglose por cuota, con `porcentajeAplicado` congelado al calcular |
| `Vendedor.topeCuotasComision` | Hasta qué cuota cobra cada vendedor (1 a 5), ya editable desde su perfil |
| `TituloCuota.detectadaPagaAt` | Momento en que el sistema vio la cuota pagada por primera vez. Se sella solo en cada importación de padrón |

La ruta `/admin/comisiones` existe con un cartel de "no implementado".

### Lo que hay que construir

1. **CRUD de `EscalaComision`** en `/admin/comisiones/escalas`. Los porcentajes
   los carga Balta; **nunca hardcodearlos**.
2. **`lib/comisiones/calcularComisionPeriodo.ts`** — función pura y testeable.
   Recibe vendedor + período y devuelve el detalle. Que sea pura importa: es
   donde un bug cuesta plata.
3. **Pantalla de liquidación** en `/admin/comisiones`: elegir período, ver el
   cálculo por vendedor, cargar gastos de representación y cerrar el período.
   Al cerrar, los porcentajes quedan congelados en `ComisionDetalle`.
4. **Tests con Vitest** sobre el cálculo, cubriendo los topes (c1 a c5) y los
   tramos de escala. Vitest todavía no está instalado.
5. **Completar los dashboards** con lo que depende de comisiones: filtro por
   cuota c1-c5 y promedio de cuota en el de Balta; ganancia del mes en el del
   vendedor. Hoy el del vendedor solo muestra hasta qué cuota cobra.

### Bosquejo del algoritmo

Sujeto a las respuestas, pero la forma general es:

1. Tomar las cuotas cobradas del período (`detectadaPagaAt` dentro del mes) de
   los títulos del vendedor.
2. Descartar las que superen `vendedor.topeCuotasComision`.
3. Para cada una, buscar en `EscalaComision` el porcentaje según el número de
   cuota y el tramo de ventas acumuladas del vendedor.
4. Generar un `ComisionDetalle` por cuota y sumar `totalComisionCuotas`.
5. Sumar `gastosRepresentacion` para el `totalComision`.

---

## 3. Fuera del MVP, para más adelante

Ninguno de estos está empezado y ninguno bloquea nada.

- **Copa challenger** (ranking nacional de vendedores). Balta dijo que no era
  prioritario y que tenía poca información. Se agrega como tabla nueva
  referenciando `ComisionPeriodo`, sin tocar lo existente.
- **Herramientas de feria** (`info.txt` punto 7): vehículo con patente,
  kilometraje, fecha de service y solicitudes. Módulo independiente.
- **Despliegue en Railway**: la app, el Postgres y un volumen persistente
  montado en `UPLOADS_DIR` para los adjuntos. El código ya está preparado; falta
  crear el proyecto y configurar las variables de entorno (ver `.env.example`).
- **Repaso final de permisos**: verificar que ningún vendedor llegue a datos de
  otro ni de otra zona escribiendo la URL a mano. Los casos críticos ya están
  cubiertos y probados (adjuntos, leads, ventas), pero conviene una pasada
  completa antes de producción.

---

## 4. Cómo levantar el proyecto

```bash
npm run dev     # levanta la base local Y la web juntas
```

Si se corre solo `next dev`, la web arranca pero todas las páginas fallan con
`ECONNREFUSED`: falta la base. Ver el [README](../README.md).

Usuarios de prueba (los crea `npm run db:seed`):

| Rol | Email | Contraseña |
|---|---|---|
| Admin | `balta@crm-csj.local` | `CambiarEstePassword123` |
| Admin | `pedro@crm-csj.local` | `CambiarEstePassword123` |

Antes de tocar la importación de padrones, correr la verificación:

```bash
npx tsx scripts/verificar-padron.ts "docs/Padron-xxx.xls" --limpiar
```

Comprueba que los totales coincidan, que reimportar no cambie nada y que un
padrón del período siguiente continúe la numeración sin duplicar ni saltear.
