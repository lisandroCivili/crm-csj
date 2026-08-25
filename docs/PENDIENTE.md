# Qué falta — punto de retomada

Documento de traspaso para arrancar una sesión nueva sin tener que releer todo.
El contexto del negocio está en [`../CLAUDE.md`](../CLAUDE.md); acá va solo lo
que queda por hacer.

> **El trabajo en curso NO está acá.** Los cambios que Balta pidió el 24/08/2026
> y su avance viven en [`PLAN.md`](PLAN.md). Este archivo describe el estado del
> sistema hasta la Fase 7 del desarrollo original.

**Estado:** rama `dev`. La Fase 7 (motor de comisiones), el perfil de usuario,
los permisos del vendedor y la navegación en celular están terminados y
verificados contra la base local. No queda ninguna fase bloqueada.

---

## 1. Fase 7 — Motor de comisiones: hecha

Balta respondió el 2026-08-12 las tres preguntas que la bloqueaban. Las reglas
que salieron de ahí quedaron documentadas en
[`../CLAUDE.md`](../CLAUDE.md#cómo-se-liquida-la-comisión) y en los comentarios
de `lib/comisiones/calcularComisionPeriodo.ts`. En resumen: la comisión sale del
padrón (no de `Venta`), se aplica sobre el importe cobrado agrupado por número
de cuota, y el tramo de escala se mide por mes, no por acumulado.

### Lo que se construyó

| Pieza | Dónde |
|---|---|
| Motor de cálculo, función pura y testeada | `lib/comisiones/calcularComisionPeriodo.ts` |
| Períodos `YYYY-MM` y sus rangos en UTC | `lib/comisiones/periodo.ts` |
| Lectura, cálculo por zona y cierre | `lib/comisiones/liquidacion.ts` |
| Tramos de escala y chequeo de huecos | `lib/comisiones/escalas.ts` |
| CRUD de escalas | `/admin/comisiones/escalas` |
| Liquidación, gastos y cierre del período | `/admin/comisiones` |
| Detalle por vendedor, con las cuotas que entraron | `/admin/comisiones/vendedor/[id]` |
| Tests (39, con Vitest) | `lib/**/*.test.ts` · `npm test` |

Cambios de schema (migración `20260812152556_comisiones_renglon_agrupado`):
`ComisionDetalle.cantidadCuotas` nuevo, y `ComisionPeriodo.ventasAcumuladas`
renombrado a `ventasDelPeriodo` — el tramo se mide por mes, el nombre viejo
decía otra cosa.

### Cosas que conviene saber antes de tocarlo

- **El primer padrón infla su período.** `detectadaPagaAt` se sella en la
  importación, así que todas las cuotas que ya venían pagadas quedan
  "detectadas" el día de la primera importación. El período de esa importación
  no sirve para liquidar; los siguientes sí.
- **Cerrar congela, reabrir recalcula.** Un período cerrado se muestra desde
  `ComisionDetalle` y no se mueve aunque cambie la escala. Si después del cierre
  entra un padrón que le suma cuotas a alguien, esa línea nace en borrador y la
  pantalla vuelve a pedir cierre.
- **La escala es única para las dos zonas** (`EscalaComision` no tiene `zonaId`).
  Si alguna vez Salta y Tucumán cobran distinto, hay que agregarle la zona.
- Los dashboards ya usan el motor: el de Balta muestra las comisiones del mes,
  el promedio de cuota y un filtro c1-c5; el del vendedor, su ganancia del mes
  con el desglose por cuota.

---

## 2. Perfil, permisos y celular: hecho

| Pieza | Dónde |
|---|---|
| Sesión que lee estado y permisos de la base en cada request | `lib/sesion.ts` (`getUsuarioActual`, `requirePermiso`) |
| Salida forzada sin bucle de redirecciones | `app/api/salir/route.ts` |
| Menú de navegación en celular | `components/layout/menu-movil.tsx` + `components/ui/sheet.tsx` |
| Listados como tarjetas por debajo de 768px | `components/layout/lista-tarjetas.tsx` |
| Perfil propio (contraseña, email de ingreso, contacto) | `/perfil` |
| Permisos y cuenta del vendedor | `/admin/vendedores/[id]` |

Migración `20260812194947_permisos_vendedor`: tres booleanos en `Vendedor`
(`puedeVerLeads`, `puedeCargarVentas`, `puedeVerComision`, todos en `true`) y
`User.telefono` para los admins, que no tienen ficha de vendedor donde guardarlo.

Cosas que conviene saber:

- **La base de desarrollo corta a las ~9 conexiones en paralelo.** Por eso
  `lib/db.ts` limita el pool a 4 en desarrollo: una página como el dashboard
  dispara más consultas que eso en un solo `Promise.all` y se caían con
  `P1017 ConnectionClosed`. En producción manda el `connection_limit` de la URL.
- El linter de React 19 prohíbe `setState` dentro de un efecto, así que el menú
  y los diálogos se resolvieron sin estado propio (`SheetClose`, y el formulario
  del diálogo que se remonta en cada apertura).
- `npm run capturas` con `CAPTURA_MOVIL=1` saca las capturas en viewport de
  celular y abre el menú, que es la única forma de navegar ahí.

---

## 3. Consultas menores al cliente

Ninguna bloquea nada.

- **Nombre completo de Pedro Toledo**, para el seed (`prisma/seed.ts` tiene el
  `TODO`). Hoy figura como "Pedro Toledo".
- En el padrón, Pedro aparece como vendedor bajo tres alias (`TOLEDO PEDRO`,
  `TOLEDO PEDRO A.`, `TOLEDO PEDRO ANTONIO`, 254 filas en total).
  **¿Esas ventas se le imputan a él como vendedor**, además de su rol de admin?
  Si la respuesta es sí, ya cobra comisión por ellas: aparece en la liquidación
  como un vendedor más.
- **Los porcentajes reales de la escala.** El sistema no trae ninguno cargado a
  propósito. Hasta que Balta los cargue en `/admin/comisiones/escalas`, la
  liquidación avisa que falta la escala y no paga nada.

---

## 4. Fuera del MVP, para más adelante

Ninguno de estos está empezado y ninguno bloquea nada.

- **Copa challenger** (ranking nacional de vendedores). Balta dijo que no era
  prioritario y que tenía poca información. Se agrega como tabla nueva
  referenciando `ComisionPeriodo`, sin tocar lo existente.
- **Herramientas de feria** (`info.txt` punto 7): vehículo con patente,
  kilometraje, fecha de service y solicitudes. Módulo independiente.
- **Despliegue en Railway**: la app, el Postgres y un volumen persistente
  montado en `UPLOADS_DIR` para los adjuntos. El código ya está preparado; falta
  crear el proyecto y configurar las variables de entorno (ver `.env.example`).
- **Repaso final de permisos**: en buena parte resuelto. El estado de la cuenta y
  los permisos se leen de la base en cada request, cada sección del vendedor está
  blindada por permiso además de por rol, y los adjuntos dejaron de servirse con
  el token viejo. Falta una pasada completa sobre el resto de las URLs de admin
  antes de producción.
- **Exportar la liquidación** a Excel o PDF para pasársela al club o al
  vendedor. Hoy se ve en pantalla; nadie lo pidió todavía.

---

## 5. Cómo levantar el proyecto

```bash
npm run dev     # levanta la base local Y la web juntas
npm test        # tests del motor de comisiones
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
