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
- **Vendedores**: agrupar por `VendedorAlias`, nunca por el texto crudo de `NomVen`.
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
- **Datos sensibles**: padrones reales y fotos de DNI no se versionan ni se sirven por URL pública.
- **Sesión**: el rol, el estado de la cuenta y los permisos se leen de la base en cada request
  (`getUsuarioActual`), nunca de los claims del JWT. Sacar a alguien del sistema se hace por
  `/api/salir`, no con `redirect("/login")`.
- **Permisos del vendedor**: filtran el menú y además blindan cada página y acción. Esconder el
  ítem del menú no es seguridad.
