/**
 * Snacks Marianita — Backend (Google Apps Script + Google Sheets)
 *
 * Punto de entrada y enrutador. Apps Script solo expone doGet/doPost, así que
 * el frontend enruta todo por un parámetro `action`:
 *   - Lecturas  -> GET  ?action=getProductos
 *   - Escrituras-> POST  body { action: 'createCompra', ... } con text/plain
 *
 * Toda respuesta es un sobre JSON: { ok: true, data } o { ok: false, error }.
 */

// Nombres de las hojas. Deben coincidir con los creados por setupSpreadsheet().
const SHEETS = {
  PERSONAS:  'Personas',
  PRODUCTOS: 'Productos',
  COMPRAS:   'Compras',
  SEGURIDAD: 'Seguridad',
}

function doGet(e) {
  return handle(e && e.parameter ? e.parameter : {})
}

function doPost(e) {
  let body = {}
  if (e && e.postData && e.postData.contents) {
    try { body = JSON.parse(e.postData.contents) } catch (err) { body = {} }
  }
  // Permite también pasar parámetros por query string en un POST.
  if (e && e.parameter) {
    Object.keys(e.parameter).forEach(k => { if (body[k] === undefined) body[k] = e.parameter[k] })
  }
  return handle(body)
}

function handle(data) {
  const action = data.action
  try {
    if (!action) {
      return json({ ok: true, data: { service: 'Snacks Marianita API', status: 'ok' } })
    }
    return json({ ok: true, data: dispatch(action, data) })
  } catch (err) {
    return json({ ok: false, error: err && err.message ? err.message : String(err) })
  }
}

function dispatch(action, data) {
  switch (action) {
    // Personas
    case 'getPersonas':    return listPersonas()
    case 'createPersona':  return withLock(() => createPersona(data))
    // Productos
    case 'getProductos':   return listProductos()
    case 'createProducto': return withLock(() => createProducto(data))
    case 'updateProducto': return withLock(() => updateProducto(data))
    // Compras
    case 'getCompras':     return listCompras(data)
    case 'createCompra':   return withLock(() => createCompra(data))
    case 'settleCompras':  return withLock(() => settleCompras(data))
    // Seguridad
    case 'verifyPin':      return verifyPin(data)
    // Reportes
    case 'getResumen':     return getResumen(data)
    default:
      throw new Error('Acción desconocida: ' + action)
  }
}

// ─── Helpers de Sheets ──────────────────────────────────────────────────────

function getSheet(name) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name)
  if (!sh) throw new Error('Falta la hoja "' + name + '". Ejecuta setupSpreadsheet() una vez.')
  return sh
}

/** Devuelve las filas de una hoja como objetos usando la fila 1 como cabeceras. */
function readRows(name) {
  const sh = getSheet(name)
  const values = sh.getDataRange().getValues()
  if (values.length < 2) return []
  const headers = values[0]
  return values.slice(1).map(row => {
    const obj = {}
    headers.forEach((h, i) => { obj[h] = row[i] })
    return obj
  })
}

/** Añade una fila ordenando los valores según las cabeceras de la hoja. */
function appendRow(name, obj) {
  const sh = getSheet(name)
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0]
  const row = headers.map(h => (obj[h] !== undefined ? obj[h] : ''))
  sh.appendRow(row)
  return obj
}

/** Actualiza la fila cuyo `id` coincide y devuelve el objeto resultante. */
function updateRowById(name, id, patch) {
  const sh = getSheet(name)
  const values = sh.getDataRange().getValues()
  const headers = values[0]
  const idCol = headers.indexOf('id')
  if (idCol === -1) throw new Error('La hoja "' + name + '" no tiene columna "id".')

  for (let r = 1; r < values.length; r++) {
    if (String(values[r][idCol]) === String(id)) {
      headers.forEach((h, c) => {
        if (Object.prototype.hasOwnProperty.call(patch, h)) {
          sh.getRange(r + 1, c + 1).setValue(patch[h])
        }
      })
      const updated = {}
      headers.forEach((h, i) => {
        updated[h] = Object.prototype.hasOwnProperty.call(patch, h) ? patch[h] : values[r][i]
      })
      return updated
    }
  }
  throw new Error('No existe el id "' + id + '" en "' + name + '".')
}

/** Serializa una respuesta JSON. */
function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON)
}

/** Envuelve escrituras en un lock para evitar condiciones de carrera. */
function withLock(fn) {
  const lock = LockService.getScriptLock()
  lock.waitLock(10000)
  try {
    return fn()
  } finally {
    lock.releaseLock()
  }
}
