# Reglas del proyecto

Convenciones y restricciones que deben respetarse al trabajar sobre este código. Se documentan
acá en archivos `.md` separados por tema y se referencian desde `CLAUDE.md`.

Reglas vigentes (por ahora documentadas en `CLAUDE.md`, se migran acá cuando crezcan):

- **Scope de zona**: toda query que lea datos de negocio se filtra por la zona activa.
- **Importación de padrón**: siempre upsert idempotente por `(tituloId, numeroCuota)`, nunca append.
- **Vendedores**: agrupar por `VendedorAlias`, nunca por el texto crudo de `NomVen`.
- **Comisiones**: los porcentajes salen de `EscalaComision`, nunca hardcodeados.
- **Datos sensibles**: padrones reales y fotos de DNI no se versionan ni se sirven por URL pública.
