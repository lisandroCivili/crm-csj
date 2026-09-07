# Reglas del proyecto

Convenciones y restricciones que deben respetarse al trabajar sobre este código. Se documentan
acá en archivos `.md` separados por tema y se referencian desde `CLAUDE.md`.

Reglas vigentes (por ahora documentadas en `CLAUDE.md`, se migran acá cuando crezcan):

- **Scope de zona**: toda query que lea datos de negocio se filtra por la zona activa.
- **Importación de padrón**: siempre upsert idempotente por `(tituloId, numeroCuota)`, nunca append.
- **Tanda de padrones**: varios archivos se importan de a uno, cada uno con su
  `PadronImport` y su transacción, y en orden de `periodoDesde` (nunca el de la
  selección ni el del nombre). Con más de uno no se muestra simulación: sería un
  número que no se va a cumplir.
- **Origen del título**: se decide al crearlo y no se recalcula. Primera importación de la zona =
  `BASE`; después, cuota mínima 1 = `VENTA_NUEVA`, mayor = `RENOVACION`.
- **Datos del cliente**: lo corregido a mano le gana al padrón. El campo editado queda en
  `Cliente.camposManuales` y la importación deja de escribirlo; el resto se sigue
  actualizando. Un campo cuya **columna no vino** en el Excel tampoco se escribe: "vacío" y
  "no informado" no son lo mismo y confundirlos borraba el dato en toda la zona. El DNI no se
  edita: es la clave con la que el padrón encuentra al cliente.
- **Vendedores**: agrupar por `VendedorAlias`, nunca por el texto crudo de `NomVen`. El alias
  es único **por zona** (`@@unique([zonaId, nomVenPadron])`), no en todo el sistema: Balta y
  Pedro venden en las dos y el mismo `NomVen` tiene que poder apuntar a una ficha en cada una.
  Se desvincula desde la ficha del vendedor.
- **Claves únicas y zona**: una restricción `@unique` global leída por código que filtra por
  zona es un defecto, no un detalle. Rompió dos veces la segunda zona: el alias trababa su
  importación en silencio, y buscar títulos sin `zonaId` hacía que el padrón de una zona le
  pisara el vendedor a los títulos de la otra —comisión calculada con producción ajena—.
  Revisar siempre las dos puntas: la restricción y todas sus lecturas. **Toda consulta de
  títulos lleva `zonaId`.** `Titulo.numTit` sí es único global y está confirmado (Balta,
  04/09/2026): el número no se repite nunca. Si un archivo trae números que ya están en la
  otra zona, la importación lo dice y corta — no es una colisión, es que el archivo no es
  de esa zona.
- **Volver a una ruta que llega de afuera** (`volverA`, `redirectTo`) pasa por `rutaInterna()`
  de `lib/navegacion.ts`: `startsWith("/")` no alcanza, porque `//otro-sitio.com` también
  empieza con barra y saca al usuario del sistema.
- **Comisiones**: los porcentajes salen de `EscalaComision`, nunca hardcodeados. El cálculo se
  hace desde el padrón (`TituloCuota`), nunca desde `Venta`, y se devenga por `detectadaPagaAt`,
  no por `fechaPago`. Un período cerrado no se recalcula: los porcentajes quedan congelados en
  `ComisionDetalle`.
- **Comisión del agente**: es otro cálculo, no una variante del anterior. Se liquida por zona,
  toma todas las cuotas sin filtrar por vendedor, **no** aplica `CUOTAS_COMISIONABLES` ni el tope
  del vendedor, y sus porcentajes salen de `EscalaAgente`. Los gastos de representación van
  aparte: no se suman a la comisión.
- **Caídas**: 6 cuotas consecutivas impagas, contadas desde la cuota más alta hacia atrás y
  sólo sobre numeración contigua. Un hueco en el histórico **corta la racha**: el título queda
  como "sin datos suficientes", nunca como "al día". No afecta ninguna comisión.
- **Anulación de venta**: anular marca, no borra, y se puede reactivar; pide un motivo, que
  además queda en `VentaHistorial` porque al reactivar se limpia de la ficha. **No toca
  ninguna comisión** —esas salen del padrón— y una venta anulada no se edita hasta
  reactivarla. Anular y reactivar son sólo del admin; **editar** es igual para los dos y sale
  del mismo `aplicarEdicion`, cambiando nada más el alcance.
- **Confirmación y foto**: el alta de venta pasa por un resumen y la edición no. El botón del
  diálogo se ata al formulario con `form="…"`, porque Radix lo portalea fuera del `<form>`.
  La foto usa un solo `<input type="file">` al que se le pone `capture` con JS; **HEIC no va
  en el `accept`** o iOS deja de convertir a JPEG y manda un archivo que no se puede ver.
- **Formulario de venta**: "Nro Suscripción" es obligatorio salvo que haya "Título", y
  "Observación" lo es cuando hay suscripción. Las dos reglas se validan en el servidor
  (`ventaSchema`), no sólo en la pantalla. Los campos numéricos (DNI, teléfono, suscripción,
  título) son identificadores: se guardan como texto de dígitos, nunca como enteros.
- **Gráficos**: los colores de serie salen de `--chart-*` y se validan contra daltonismo
  antes de usarlos; **rojo y verde nunca juntos**. Una serie con orden (meses) lleva rampa
  de un solo tono, no colores distintos. El texto no lleva el color de la serie, y lo que
  no se sabe no se dibuja como cero.
- **Móvil**: probar desde el teléfono necesita `allowedDevOrigins`; sin eso `next dev` responde
  403 a los chunks de `/_next` y React no hidrata, aunque la pantalla se dibuje. Nunca envolver
  un `next/link` en el `Close` de un primitivo de Radix: `Link` llama a `preventDefault()` y el
  cierre se saltea. `overflow-x: clip` en html/body, nunca `hidden`, que rompe el header sticky
  —y es una red de contención, no un reemplazo de arreglar lo que se desborda—.
- **Catálogo de planes**: el Excel de precios crea planes nuevos pero no pisa el `nombre` ni
  el `activo` de los que ya existen; eso lo edita el admin y manda sobre el archivo. El
  `codigoProducto` no se edita: es la clave del upsert. Dar de baja es `activo: false`.
- **Subir archivos**: se usa `components/layout/selector-archivos.tsx`, no un
  `<input type="file">` suelto. El input real no se esconde con `display: none`
  (rompe el aviso de campo requerido) ni se vacía antes de abrir el selector
  (cancelar el diálogo dejaría el formulario vacío pareciendo lleno).
- **Formularios**: el éxito de una server action se marca con `estado.ok`, nunca con "no hay
  errores" (el estado inicial `{}` no tiene errores). Un toast en un `useEffect` no se ve si
  el formulario desaparece al revalidar. Los duplicados de Prisma se leen con
  `camposDuplicados()`, que ya contempla que `meta.target` no venga con el driver adapter.
- **Actividad**: `vendedorId` es a nombre de quien queda el movimiento y `actorUserId` es
  quien apretó el botón; el filtro va por el primero y la pantalla muestra los dos. Se escribe
  **dentro de la transacción que la acción ya tiene abierta**, con `registrarActividad(tx, …)`.
  `Actividad.cambios` duplica a propósito el diff de `VentaHistorial`, y las dos pantallas lo
  dibujan con el mismo componente. El id de vendedor que llega por query se valida contra los
  de la zona: uno ajeno mostraría el feed entero como si fuera suyo.
- **Números de Excel**: se leen con `aNumeroLocal()` (`lib/excel/numero.ts`), nunca con
  `Number()` a secas. `Number("250.000")` da 250, no doscientos cincuenta mil.
- **Fechas**: un **instante** (cuándo se cargó una venta, cuándo se importó un padrón) se
  muestra con `dia()` o `momento()`, en hora argentina; un **día del padrón** (emisión,
  fecha de pago, vigencia) con `diaDelPadron()`, en UTC, porque no tiene hora. Mostrar un
  instante en UTC ponía la venta cargada de noche en el día siguiente. La zona va escrita
  en el formateador: sin ella depende del servidor, y Railway corre en UTC.
- **Temporales de la importación**: el archivo subido caduca a las 24 horas. Son padrones
  reales; el que abandona la previsualización no pasa por el borrado y quedaban para
  siempre en el volumen persistente.
- **Pantallas que enseñan**: un instructivo en pantalla que lleva a hacer algo mal es un
  defecto aunque el código esté bien. El laboratorio listaba los padrones de las dos zonas
  juntos con un "importalos en orden"; ahora muestra los de la zona activa
  (`lib/padron/padrones-prueba.ts`).
- **Verificación**: `npm run demo` arma el escenario de las dos zonas (idempotente) y
  `npm run qa` corre las 57 comprobaciones de permisos y aislamiento con exit code. El
  escenario de **Salta no se toca**: sus números son la referencia de todas las guías de
  prueba ya validadas. Los fixtures de Excel se fabrican en memoria, nunca se versionan.
- **Datos sensibles**: padrones reales y fotos de DNI no se versionan ni se sirven por URL pública.
- **Sesión**: el rol, el estado de la cuenta y los permisos se leen de la base en cada request
  (`getUsuarioActual`), nunca de los claims del JWT. Sacar a alguien del sistema se hace por
  `/api/salir`, no con `redirect("/login")`.
- **Permisos del vendedor**: son cuatro (`verLeads`, `cargarVentas`, `verComision`,
  `verCartera`), todos en `true` por defecto: se **sacan**, no se dan. Filtran el menú y además
  blindan cada página y acción. Esconder el ítem del menú no es seguridad.
- **La comisión del vendedor**: `/vendedor/comision` usa el mismo motor que la pantalla del
  admin (`obtenerLiquidacionVendedor`, `cuotasDelPeriodo`). **Nunca escribir un cálculo
  paralelo**: la pantalla existe para que el vendedor pueda discutir un peso, y no serviría si
  su total saliera de otra cuenta que el que le pagan. El alcance sale de la sesión, jamás de
  la URL; lo único que viaja por query es el período. No se le muestra el nombre de la escala
  ni se le deja editar los gastos de representación, y los links a la cartera se dibujan sólo
  con `verCartera`: ofrecer lo que la otra pantalla rebota es un defecto.
- **Listados**: paginan de a 50 con el patrón de `searchParams` del admin (`q`,
  `pagina`, y el filtro propio de cada uno), y la paginación sale de
  `components/layout/paginacion.tsx`. **Un `<a>` no se deshabilita**: en el
  extremo va un `<button disabled>` y nunca un link apagado con clases —
  `<Button asChild disabled>` manda el `disabled` al `<a>`, donde no hace nada, y
  las clases `disabled:*` cuelgan de `:disabled`, que es sólo de los controles de
  formulario. Los chips cuentan **sobre la búsqueda**, no sobre el filtro activo.
  Y con el listado vacío de verdad —sin búsqueda ni filtro— no se dibujan ni el
  buscador ni los chips: no hay nada que filtrar y tapan el cartel que explica
  por qué no hay nada.
- **Ofrecer lo que la otra pantalla rebota es un defecto.** El botón "Cargar
  venta" de la ficha del lead se dibujaba sin mirar `cargarVentas`, y los dos
  `db.venta.count` del dashboard corrían sin ese permiso para alimentar una
  tarjeta que no se renderiza. La seguridad ya estaba; lo que faltaba era no
  prometer. Es el mismo criterio que los links a la cartera en la comisión.
- **La cartera del vendedor**: lista **títulos**, no clientes, filtrando por `vendedorId` y
  `zonaId`. Agrupar por cliente —como hace el listado del admin— mostraría producción ajena,
  porque un cliente puede tener títulos de dos vendedores. Balta pidió que "solo admin ve
  clientes": el vendedor ve únicamente los suyos, y `puedeVerCartera` deja apagarlo. Los
  filtros de estado son disjuntos: "en riesgo" exige `caidaConfiable`, o el chip contaría lo
  que el badge de la fila llama "sin datos suficientes".
