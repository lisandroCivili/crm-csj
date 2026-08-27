# Reglas del proyecto

Convenciones y restricciones que deben respetarse al trabajar sobre este código. Se documentan
acá en archivos `.md` separados por tema y se referencian desde `CLAUDE.md`.

Reglas vigentes (por ahora documentadas en `CLAUDE.md`, se migran acá cuando crezcan):

- **Scope de zona**: toda query que lea datos de negocio se filtra por la zona activa.
- **Importación de padrón**: siempre upsert idempotente por `(tituloId, numeroCuota)`, nunca append.
- **Origen del título**: se decide al crearlo y no se recalcula. Primera importación de la zona =
  `BASE`; después, cuota mínima 1 = `VENTA_NUEVA`, mayor = `RENOVACION`.
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
- **Datos sensibles**: padrones reales y fotos de DNI no se versionan ni se sirven por URL pública.
- **Sesión**: el rol, el estado de la cuenta y los permisos se leen de la base en cada request
  (`getUsuarioActual`), nunca de los claims del JWT. Sacar a alguien del sistema se hace por
  `/api/salir`, no con `redirect("/login")`.
- **Permisos del vendedor**: filtran el menú y además blindan cada página y acción. Esconder el
  ítem del menú no es seguridad.
