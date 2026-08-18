# Credenciales de prueba

Cuentas para levantar el sistema en **desarrollo local**. No son de producción y
no sirven para ningún dato real: la base local se crea vacía y se llena con
`npm run db:seed` y con los padrones que uno importe a mano.

> Antes de poner el sistema en producción hay que cambiar estas contraseñas y
> crear las cuentas reales de Balta y Pedro. La contraseña del seed es
> deliberadamente obvia para que nadie la deje puesta sin darse cuenta.

## Administradores

Los crea `npm run db:seed`. Los dos tienen todos los permisos.

| Nombre | Email | Contraseña |
|---|---|---|
| Baltazar Ignacio Toledo Perez | `balta@crm-csj.local` | `CambiarEstePassword123` |
| Pedro Toledo | `pedro@crm-csj.local` | `CambiarEstePassword123` |

Después de loguearse, el admin tiene que **elegir zona** (Salta o Tucumán). Esa
elección se guarda en la cookie `zona_activa` y filtra todo lo que ve y carga;
se cambia desde el selector de arriba a la izquierda.

La contraseña se puede pisar antes de seedear:

```bash
SEED_ADMIN_PASSWORD="otra-cosa" npm run db:seed
```

Correr el seed de nuevo **no** revierte una contraseña ya cambiada desde la
aplicación: solo actualiza el nombre y el rol.

## Cambiar la contraseña y el email

Cada uno lo hace desde **Mi perfil** (está en el menú de arriba a la derecha, y
en celular también dentro del menú lateral): ahí se cambia la contraseña —pide
la actual—, el email con el que se entra y los datos de contacto.

Al cambiar la contraseña se cierra la sesión y hay que entrar con la nueva. Es a
propósito: la sesión vieja no se puede invalidar de otra forma.

**Si un vendedor pierde su contraseña**, cualquier admin se la cambia desde la
ficha del vendedor (*Vendedores → el vendedor → Cuenta de ingreso → Cambiar
contraseña*). El sistema no manda mails: el admin escribe la contraseña nueva y
se la pasa por su cuenta. Desde ahí también se le cambia el email de ingreso y
se le suspende o reactiva el acceso.

Entre admins no hay pantalla de administración: si Balta o Pedro pierden la
suya, se resuelve con el seed o desde la base.

## Vendedor

El seed no crea vendedores: dependen de la zona y del padrón, así que se cargan
a mano. Para tener uno con acceso al sistema:

1. Entrar como admin y elegir zona.
2. **Vendedores → Nuevo vendedor**. El DNI y el código son obligatorios; el tope
   de cuotas por las que cobra comisión (c1 a c5) se elige acá y después se
   puede editar.
3. En el perfil del vendedor recién creado, **Crear cuenta de ingreso**: se le
   pone un email y una contraseña inicial de al menos 8 caracteres.

La cuenta es opcional a propósito: hay vendedores que figuran en el padrón y no
usan el CRM.

En su ficha, la tarjeta **Permisos** define qué secciones ve: sus leads, sus
ventas y su comisión. Vienen las tres encendidas y se apagan de a una; el cambio
le llega al vendedor en su próximo clic, sin que tenga que volver a entrar.

Para que a un vendedor le aparezcan comisiones tiene que estar **vinculado a sus
títulos**, lo que pasa al importar un padrón donde su `NomVen` esté mapeado a él
(ver la pantalla de Padrón).

## Cuentas que aparecen en las capturas

Durante la verificación del motor de comisiones se usó una vendedora de prueba,
`juana@crm-csj.local`, con títulos y cuotas inventados. Esos datos y esa cuenta
**se borraron de la base local** al terminar; si aparecen en alguna captura
vieja, no existen más. Se recrean siguiendo los tres pasos de arriba.
