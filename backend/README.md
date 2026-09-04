# Snacks Marianita — Backend (Google Apps Script + Sheets)

API ligera sobre una hoja de cálculo de Google. Cada hoja es una "tabla":

| Hoja        | Columnas                                                                                | Rol                          |
|-------------|-----------------------------------------------------------------------------------------|------------------------------|
| `Personas`  | `id, employeeId, name, phone, initial, createdAt, status, pinHash, pinSalt`               | Empleados                    |
| `Productos` | `id, name, emoji, price, active, stock`                                                   | Catálogo de snacks           |
| `Compras`   | `id, personId, productId, quantity, method, date, paidMethod, paidDate, unitPrice`         | Una fila por ítem comprado   |
| `Seguridad` | `clave, valor`                                                                            | PIN del panel y secreto HMAC |

- `Personas.status`: `pending` (esperando aprobación) · `active` · `rejected` · `inactive`.
  Las filas antiguas sin `status` se tratan como `active`.
- `Compras.unitPrice` congela el precio al momento de la compra; si cambia el precio
  del producto, el histórico no se altera.
- Una compra fiada (`method: 'debt'`) se salda escribiendo `paidMethod` + `paidDate`.
- `Seguridad` guarda `pinHash` / `pinSalt` (PIN de Mari) y `sessionSecret` (firma de
  los tokens). **Nunca** un PIN en texto plano.

## Cómo se comunica con el frontend

Apps Script solo expone `doGet`/`doPost` y **no responde el preflight CORS**. Por eso
el cliente ([`frontend/src/api.js`](../frontend/src/api.js)) usa un esquema RPC:

- **Lecturas** → `GET  {URL}?action=getProductos`
- **Escrituras** → `POST {URL}` con `Content-Type: text/plain` y cuerpo `{ "action": "...", ... }`
  (text/plain evita que el navegador dispare el preflight OPTIONS).

Toda respuesta es un sobre: `{ "ok": true, "data": ... }` o, si falla:

```json
{ "ok": false, "code": "ERR-055", "error": "Cantidad demasiado alta", "params": { "max": 100 } }
```

## Códigos de error

El backend **no decide el idioma del usuario**: lanza un código del catálogo de
[`Errores.gs`](Errores.gs) y el frontend lo traduce con sus propios textos en
español, inglés y coreano (bloque `errors` de `frontend/src/i18n/*.js`).

| Campo    | Para qué sirve                                                              |
|----------|------------------------------------------------------------------------------|
| `code`   | El contrato. Es lo que el frontend usa para elegir el mensaje.                |
| `error`  | Texto en español, solo de respaldo y para leer los registros de Apps Script.  |
| `params` | Valores a interpolar en el texto traducido (`{{max}}`, `{{productId}}`…).     |

Los códigos van por familias: `ERR-00x` sesión y permisos · `ERR-01x` estado de la
cuenta · `ERR-02x` PIN · `ERR-03x` datos de la persona · `ERR-04x` productos ·
`ERR-05x` compras · `ERR-07x` reportes · `ERR-09x` configuración de la hoja.

En el código se lanzan con `fail('ERR-054', { productId })`; nunca con
`throw new Error('texto')`, porque eso deja al usuario con un mensaje en español
sin importar el idioma que tenga elegido.

> **Al añadir un código** hay que ponerlo en `Errores.gs` **y en los tres idiomas**.
> `npm run test:run` (en `frontend/`) falla si alguno se queda sin traducir, si
> sobra una traducción sin código, o si los idiomas se desincronizan.

## Autenticación

El Web App se despliega con acceso anónimo, así que **la tabla `PERMISOS` de
[`Code.gs`](Code.gs) es el único control de acceso real**. Esconder un botón en la UI
no protege nada: cualquiera puede llamar al endpoint directamente.

Hay dos sesiones, ambas representadas por un token firmado con HMAC-SHA256
(`payload.firma`, sin estado en Sheets, válido 12 h):

| Sesión  | Se obtiene con                    | Permite                                            |
|---------|-----------------------------------|----------------------------------------------------|
| Empleado| `login` / `setUserPin` / `createPersona` | Ver y crear **sus** compras, saldar **sus** deudas |
| Mari    | `adminLogin` (PIN del panel)      | Todo lo anterior + gestión de personas y productos |

El token se manda en cada petición como parámetro `token` (query en GET, campo del
cuerpo en POST). Defensas incluidas:

- PINs guardados solo como `SHA-256(salt:pin)`, con salt por usuario.
- Máximo **5 intentos fallidos por usuario cada 15 min** (`CacheService`).
- `createCompra` **ignora el `personId` del cuerpo** y usa el del token: nadie puede
  registrar compras a nombre de otro.
- `settleCompras` solo salda compras propias, fiadas y aún pendientes.
- Comparaciones de PIN y firma en tiempo constante.
- La lista pública de personas no incluye teléfonos ni a las rechazadas/inactivas;
  esos datos solo salen con token de Mari.

> **Limitación conocida**: `setUserPin` es público a propósito, porque es el flujo de
> "aún no tengo PIN" (registro, reset de Mari, usuario antiguo). Mientras una persona
> no tenga PIN, cualquiera con la URL puede reclamar esa cuenta. Por eso `resetUserPin`
> es exclusivo de Mari y conviene que el usuario cree su PIN enseguida.

### Acciones disponibles

| action             | Método | Permiso  | Cuerpo / Query                              | Devuelve                            |
|--------------------|--------|----------|---------------------------------------------|-------------------------------------|
| `getProductos`     | GET    | público  | —                                           | `Producto[]`                        |
| `getPersonas`      | GET    | público  | —                                           | `Persona[]` (completa si eres Mari) |
| `createPersona`    | POST   | público  | `{ employeeId, name, phone, pin }`          | `{ token, persona }`                |
| `setUserPin`       | POST   | público  | `{ id, pin }` (solo si no tiene PIN)        | `{ token, persona }`                |
| `login`            | POST   | público  | `{ employeeId \| id, pin }`                  | `{ token, persona }`                |
| `adminLogin`       | POST   | público  | `{ pin }`                                   | `{ token }`                         |
| `getCompras`       | GET    | empleado | `personId?` (solo lo usa Mari)              | `Compra[]`                          |
| `createCompra`     | POST   | empleado | `{ method, items[] }`                       | `Compra[]` (una por ítem)           |
| `settleCompras`    | POST   | empleado | `{ ids[], paidMethod }`                     | `Compra[]`                          |
| `setPersonaStatus` | POST   | Mari     | `{ id, status }`                            | `Persona`                           |
| `resetUserPin`     | POST   | Mari     | `{ id }`                                    | `Persona`                           |
| `createProducto`   | POST   | Mari     | `{ name, price, emoji?, active?, stock? }`  | `Producto`                          |
| `updateProducto`   | POST   | Mari     | `{ id, price?, active?, name?, emoji?, stock? }` | `Producto`                     |
| `getResumen`       | GET    | Mari     | `fecha_inicio?, fecha_fin?` (ISO)           | `{ total, cash, transfer, debt, count, lineCount }` |
| `changeAdminPin`   | POST   | Mari     | `{ currentPin, newPin }`                    | `{ ok: true }`                      |

## Despliegue

### Opción A — Manual (sin herramientas)

1. Crea una hoja de cálculo nueva en Google Sheets.
2. Menú **Extensiones → Apps Script**.
3. Copia el contenido de cada archivo `.gs` de esta carpeta en archivos con el mismo
   nombre dentro del editor (usa el `+` → Script). Pega también `appsscript.json`
   (Configuración del proyecto → "Mostrar archivo de manifiesto appsscript.json").
4. Ejecuta una vez la función **`setupSpreadsheet`** (selecciónala arriba y pulsa
   ▶ Ejecutar). Autoriza los permisos. Crea las hojas y formatos, genera el secreto
   de sesión y un **PIN de administración aleatorio que se muestra una sola vez** en
   el aviso emergente y en el registro de ejecución. **Anótalo**: no se puede recuperar
   (para cambiarlo, `cambiarPinAdmin()` en [`Setup.gs`](Setup.gs)).
5. **Implementar → Nueva implementación → Aplicación web**:
   - *Ejecutar como*: Yo
   - *Quién tiene acceso*: **Cualquier usuario**
6. Copia la **URL del Web App** (termina en `/exec`).
7. En `frontend/.env.local` pon: `VITE_API_URL=<esa URL>`.

> Cada vez que cambies el código, usa **Implementar → Administrar implementaciones →
> editar (lápiz) → Nueva versión**, para que la misma URL sirva el código nuevo.

### Opción B — clasp (CLI)

```bash
npm install -g @google/clasp
clasp login
# Vincula a un proyecto ya existente:
cp .clasp.json.example .clasp.json   # y pega tu scriptId
clasp push
```

Tras el primer `push`, ejecuta `setupSpreadsheet` desde el editor (paso 4 de arriba)
y despliega como Web App (paso 5).

### Actualizar un despliegue anterior

No hace falta tocar los datos existentes:

- Las personas conservan su PIN: el esquema de hash no cambió.
- Si la hoja `Seguridad` todavía tiene el PIN en texto plano (fila `pin`), se migra
  a `pinHash`/`pinSalt` y se borra automáticamente **la primera vez que se usa
  correctamente**. Si nadie entra al panel, sigue ahí: entra una vez y verifica que
  la fila `pin` desapareció.
- `sessionSecret` se crea solo la primera vez que alguien inicia sesión.
- Las sesiones abiertas en los navegadores se pierden: todos tendrán que volver a
  teclear su PIN una vez.

## Cambiar el PIN de Mari

Desde la app no hay pantalla todavía; hay dos vías:

- **Desde el editor**: abre [`Setup.gs`](Setup.gs), escribe los 4 dígitos en
  `NUEVO_PIN` dentro de `cambiarPinAdmin()`, ejecuta la función y vuelve a dejarlo vacío.
- **Por API**: `POST { action: 'changeAdminPin', currentPin, newPin, token }` con un
  token de Mari.

Editar la hoja a mano ya no sirve: el valor guardado es un hash, no el PIN.

## Pruebas

La lógica de seguridad (hash de PIN, tokens, migración del PIN legado y límite de
intentos) tiene pruebas que corren fuera de Google, sobre stubs de las APIs de Apps
Script:

```bash
node backend/test/seguridad.test.js
```

La correspondencia entre el catálogo de códigos y las traducciones se comprueba
desde el frontend, con el resto de la suite:

```bash
cd frontend && npm run test:run
```
