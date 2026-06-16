# Snacks Marianita — Backend (Google Apps Script + Sheets)

API ligera sobre una hoja de cálculo de Google. Cada hoja es una "tabla":

| Hoja        | Columnas                                                  | Rol                          |
|-------------|-----------------------------------------------------------|------------------------------|
| `Personas`  | `id, employeeId, name, phone, initial, createdAt`         | Empleados                    |
| `Productos` | `id, name, emoji, price, active`                          | Catálogo de snacks           |
| `Compras`   | `id, personId, productId, quantity, method, date`         | Una fila por ítem comprado   |
| `Seguridad` | `clave, valor`                                            | PIN del panel (clave `pin`)  |

## Cómo se comunica con el frontend

Apps Script solo expone `doGet`/`doPost` y **no responde el preflight CORS**. Por eso
el cliente ([`frontend/src/api.js`](../frontend/src/api.js)) usa un esquema RPC:

- **Lecturas** → `GET  {URL}?action=getProductos`
- **Escrituras** → `POST {URL}` con `Content-Type: text/plain` y cuerpo `{ "action": "...", ... }`
  (text/plain evita que el navegador dispare el preflight OPTIONS).

Toda respuesta es un sobre: `{ "ok": true, "data": ... }` o `{ "ok": false, "error": "..." }`.

### Acciones disponibles

| action            | Método | Cuerpo / Query                          | Devuelve                         |
|-------------------|--------|-----------------------------------------|----------------------------------|
| `getPersonas`     | GET    | —                                       | `Persona[]`                      |
| `createPersona`   | POST   | `{ employeeId, name, phone }`           | `Persona`                        |
| `getProductos`    | GET    | —                                       | `Producto[]`                     |
| `createProducto`  | POST   | `{ name, price, emoji?, active? }`      | `Producto`                       |
| `updateProducto`  | POST   | `{ id, price? , active?, name?, emoji? }` | `Producto`                     |
| `getCompras`      | GET    | `personId?`                             | `Compra[]`                       |
| `createCompra`    | POST   | `{ personId, method, items[] }`         | `Compra[]` (una por ítem)        |
| `verifyPin`       | POST   | `{ pin }`                               | `{ valid: boolean }`             |
| `getResumen`      | GET    | `fecha_inicio?, fecha_fin?` (ISO)       | `{ total, cash, transfer, count }` |

## Despliegue

### Opción A — Manual (sin herramientas)

1. Crea una hoja de cálculo nueva en Google Sheets.
2. Menú **Extensiones → Apps Script**.
3. Copia el contenido de cada archivo `.gs` de esta carpeta en archivos con el mismo
   nombre dentro del editor (usa el `+` → Script). Pega también `appsscript.json`
   (Configuración del proyecto → "Mostrar archivo de manifiesto appsscript.json").
4. Ejecuta una vez la función **`setupSpreadsheet`** (selecciónala arriba y pulsa
   ▶ Ejecutar). Autoriza los permisos. Esto crea las hojas, formatos, los 58
   productos y el PIN por defecto `1234`.
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

## Cambiar el PIN

Edita el valor de la fila `pin` en la hoja **Seguridad**. No requiere redesplegar.

## Notas de seguridad

- El PIN nunca llega al bundle del frontend; se valida aquí.
- El acceso es anónimo ("Cualquier usuario"): cualquiera con la URL puede llamar la
  API. Para un control real, añade una clave compartida en `Seguridad` y valídala en
  `dispatch()` antes de las escrituras.
