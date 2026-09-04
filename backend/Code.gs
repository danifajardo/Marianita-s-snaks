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
    return json({ ok: true, data: dispatch(action, data, autorizar(action, data)) })
  } catch (err) {
    // El sobre lleva un código (ERR-0xx) para que el frontend traduzca el mensaje
    // al idioma del usuario; `error` es solo el respaldo en español. Ver Errores.gs.
    return json(errorPayload(err))
  }
}

/**
 * Permisos por acción. El despliegue es ANYONE_ANONYMOUS, así que este mapa es
 * el ÚNICO control de acceso real: la UI puede esconder botones, pero cualquiera
 * puede llamar al endpoint directamente.
 *
 *   'public' → sin sesión (catálogo, registro, inicio de sesión)
 *   'user'   → token de empleado (o de Mari, que también pasa)
 *   'admin'  → token de Marianita
 */
const PERMISOS = {
  // Público
  getProductos:    'public',
  getPersonas:     'public',   // lista recortada; con token de admin devuelve todo
  createPersona:   'public',
  setUserPin:      'public',   // solo funciona si la persona aún no tiene PIN
  login:           'public',
  adminLogin:      'public',
  // Empleado autenticado
  getCompras:      'user',     // solo las propias; con token de admin, todas
  createCompra:    'user',
  settleCompras:   'user',
  // Solo Marianita
  setPersonaStatus: 'admin',
  resetUserPin:     'admin',
  createProducto:   'admin',
  updateProducto:   'admin',
  getResumen:       'admin',
  changeAdminPin:   'admin',
}

/** Valida el token según PERMISOS y devuelve el contexto { sub, role }. */
function autorizar(action, data) {
  const nivel = PERMISOS[action]
  if (nivel === undefined) fail('ERR-005', { action: action })
  if (nivel === 'public') {
    // Un token válido enriquece la respuesta (p. ej. getPersonas para Mari) pero
    // uno inválido o caducado no debe tumbar una acción que no lo necesita.
    if (!data.token) return { sub: '', role: 'anon' }
    try { return leerToken(data.token) } catch (err) { return { sub: '', role: 'anon' } }
  }

  const ctx = leerToken(data.token)
  if (nivel === 'admin' && ctx.role !== 'admin') fail('ERR-004')
  return ctx
}

function dispatch(action, data, ctx) {
  switch (action) {
    // Personas
    case 'getPersonas':       return listPersonas(ctx)
    case 'createPersona':     return withLock(() => createPersona(data))
    case 'setPersonaStatus':  return withLock(() => setPersonaStatus(data))
    case 'login':             return login(data)
    case 'adminLogin':        return adminLogin(data)
    case 'setUserPin':        return withLock(() => setUserPin(data))
    case 'resetUserPin':      return withLock(() => resetUserPin(data))
    case 'changeAdminPin':    return withLock(() => changeAdminPin(data))
    // Productos
    case 'getProductos':   return listProductos()
    case 'createProducto': return withLock(() => createProducto(data))
    case 'updateProducto': return withLock(() => updateProducto(data))
    // Compras
    case 'getCompras':     return listCompras(data, ctx)
    case 'createCompra':   return withLock(() => createCompra(data, ctx))
    case 'settleCompras':  return withLock(() => settleCompras(data, ctx))
    // Reportes
    case 'getResumen':     return getResumen(data)
    default:
      fail('ERR-005', { action: action })
  }
}

// ─── Helpers de Sheets ──────────────────────────────────────────────────────

function getSheet(name) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name)
  if (!sh) fail('ERR-090', { sheet: name })
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
  return appendRows(name, [obj])[0]
}

/**
 * Añade varias filas en UNA sola escritura. Llamar appendRow() en bucle hacía una
 * petición a Sheets por fila, que es lo que agota la cuota de 6 min de Apps Script.
 */
function appendRows(name, objs) {
  if (!objs || objs.length === 0) return []
  const sh = getSheet(name)
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0]
  const rows = objs.map(obj => headers.map(h => (obj[h] !== undefined ? obj[h] : '')))
  sh.getRange(sh.getLastRow() + 1, 1, rows.length, headers.length).setValues(rows)
  return objs
}

/** Actualiza la fila cuyo `id` coincide y devuelve el objeto resultante. */
function updateRowById(name, id, patch) {
  const patches = {}
  patches[String(id)] = patch
  return updateRowsById(name, patches)[String(id)]
}

/**
 * Actualiza varias filas por id en una sola pasada: una lectura de la hoja y una
 * escritura por fila (antes era una lectura completa y una escritura POR CELDA
 * en cada llamada). Devuelve { id: objetoActualizado }.
 */
function updateRowsById(name, patchesById) {
  const ids = Object.keys(patchesById)
  if (ids.length === 0) return {}

  const sh = getSheet(name)
  const values = sh.getDataRange().getValues()
  const headers = values[0]
  const idCol = headers.indexOf('id')
  if (idCol === -1) fail('ERR-091', { sheet: name })

  const pendientes = {}
  ids.forEach(id => { pendientes[id] = true })
  const resultado = {}

  for (let r = 1; r < values.length && ids.length > Object.keys(resultado).length; r++) {
    const rowId = String(values[r][idCol])
    if (!pendientes[rowId]) continue
    delete pendientes[rowId]

    const patch = patchesById[rowId]
    const nuevaFila = headers.map((h, i) =>
      Object.prototype.hasOwnProperty.call(patch, h) ? patch[h] : values[r][i])
    sh.getRange(r + 1, 1, 1, headers.length).setValues([nuevaFila])

    const updated = {}
    headers.forEach((h, i) => { updated[h] = nuevaFila[i] })
    resultado[rowId] = updated
  }

  const faltantes = Object.keys(pendientes)
  if (faltantes.length > 0) {
    fail('ERR-092', { id: faltantes[0], sheet: name })
  }
  return resultado
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
