/**
 * Personas — empleados que registran compras.
 * Hoja "Personas": id | employeeId | name | phone | initial | createdAt | status | pinHash | pinSalt
 *
 * status: 'pending' (recién registrado, esperando aprobación de Mari) |
 *         'active' (aprobado, puede usar la app) | 'rejected' (rechazado) |
 *         'inactive' (desactivado por Mari).
 * Las personas creadas antes de esta función no tienen status → se asumen 'active'.
 */

// Estados que pueden iniciar sesión: 'pending' entra pero solo ve la pantalla de espera.
const ESTADOS_CON_ACCESO = ['active', 'pending']

// IMPORTANTE: nunca exponer pinHash/pinSalt al cliente. Solo se informa si tiene PIN.
// El teléfono tampoco viaja en la lista pública: solo Mari lo necesita.
function mapPersona(p) {
  return {
    id:         String(p.id),
    employeeId: String(p.employeeId),
    name:       String(p.name),
    initial:    String(p.initial || (p.name ? p.name.charAt(0).toUpperCase() : '?')),
    status:     String(p.status || 'active'),
    hasPin:     !!String(p.pinHash || ''),
  }
}

/** Versión para el panel de Mari: añade los campos que solo ella necesita. */
function mapPersonaAdmin(p) {
  const base = mapPersona(p)
  base.phone     = String(p.phone || '')
  base.createdAt = toIso(p.createdAt)
  return base
}

function rawPersona(id) {
  return readRows(SHEETS.PERSONAS).filter(function (p) { return String(p.id) === String(id) })[0]
}

function rawPersonaPorEmpleado(employeeId) {
  return readRows(SHEETS.PERSONAS).filter(function (p) {
    return String(p.employeeId) === String(employeeId)
  })[0]
}

/**
 * Lista de personas. Mari ve a todas con teléfono; el resto solo ve a quienes
 * pueden aparecer en el selector (activas y pendientes) y sin datos de contacto.
 */
function listPersonas(ctx) {
  const filas = readRows(SHEETS.PERSONAS)
  if (ctx && ctx.role === 'admin') return filas.map(mapPersonaAdmin)
  return filas
    .filter(function (p) { return ESTADOS_CON_ACCESO.indexOf(String(p.status || 'active')) !== -1 })
    .map(mapPersona)
}

/** Persona del token, ya validada. Lanza si desapareció o perdió el acceso. */
function personaDeSesion(ctx) {
  const row = rawPersona(ctx.sub)
  if (!row) fail('ERR-010')
  const status = String(row.status || 'active')
  if (ESTADOS_CON_ACCESO.indexOf(status) === -1) fail('ERR-011')
  return row
}

/** Exige que quien llama sea una persona aprobada (no solo pendiente). */
function assertPersonaActiva(ctx) {
  const row = personaDeSesion(ctx)
  if (String(row.status || 'active') !== 'active') {
    fail('ERR-012')
  }
  return row
}

/** Inicia sesión con employeeId (o id) + PIN. Devuelve el token y la persona. */
function login(data) {
  const employeeId = String(data.employeeId || '').trim()
  const id         = String(data.id || '').trim()
  const pin        = String(data.pin || '')

  const row = employeeId ? rawPersonaPorEmpleado(employeeId) : rawPersona(id)
  // Mismo código exista o no la persona: no revelamos qué ids están registrados.
  if (!row) fail('ERR-021')

  const scope = 'user:' + String(row.id)
  assertNoBloqueado(scope)

  const stored = String(row.pinHash || '')
  if (!stored) fail('ERR-022')
  if (!equalsSeguro(hashPin(pin, row.pinSalt), stored)) {
    registrarFallo(scope)
    fail('ERR-021')
  }
  limpiarFallos(scope)

  const status = String(row.status || 'active')
  if (ESTADOS_CON_ACCESO.indexOf(status) === -1) fail('ERR-011')

  return { token: emitirToken(row.id, 'user'), persona: mapPersona(row) }
}

/** Inicia sesión como Marianita con el PIN del panel. */
function adminLogin(data) {
  assertNoBloqueado('admin')
  if (!verificarPinAdmin(String(data.pin || ''))) {
    registrarFallo('admin')
    fail('ERR-025')
  }
  limpiarFallos('admin')
  return { token: emitirToken('', 'admin') }
}

/**
 * Crea el PIN de un usuario que aún NO tiene (registro, reset o usuario viejo) y
 * lo deja logueado. No permite sobreescribir un PIN existente: para eso Mari debe
 * resetearlo primero.
 */
function setUserPin(data) {
  const id  = String(data.id || '')
  const pin = validarFormatoPin(String(data.pin || '').trim())
  const row = rawPersona(id)
  if (!row) fail('ERR-010')
  if (String(row.pinHash || '')) fail('ERR-023')
  const status = String(row.status || 'active')
  if (ESTADOS_CON_ACCESO.indexOf(status) === -1) fail('ERR-011')

  const salt = makeSalt()
  const persona = mapPersona(updateRowById(SHEETS.PERSONAS, id, { pinSalt: salt, pinHash: hashPin(pin, salt) }))
  return { token: emitirToken(id, 'user'), persona: persona }
}

// Resetea (borra) el PIN de un usuario — solo Mari. Luego el usuario crea uno nuevo.
function resetUserPin(data) {
  const id = String(data.id || '')
  if (!id) fail('ERR-035')
  return mapPersonaAdmin(updateRowById(SHEETS.PERSONAS, id, { pinHash: '', pinSalt: '' }))
}

// Aprueba / rechaza / desactiva a una persona — solo Mari.
function setPersonaStatus(data) {
  const id = String(data.id || '')
  const status = String(data.status || '')
  if (!id) fail('ERR-035')
  if (['pending', 'active', 'rejected', 'inactive'].indexOf(status) === -1) fail('ERR-014')
  return mapPersonaAdmin(updateRowById(SHEETS.PERSONAS, id, { status: status }))
}

/** Registro público. Queda 'pending' y con sesión iniciada para ver la pantalla de espera. */
function createPersona(data) {
  const employeeId = String(data.employeeId || '').trim()
  const name       = String(data.name || '').trim()
  const phone      = String(data.phone || '').trim()
  const pin        = String(data.pin || '').trim()

  if (!employeeId)                    fail('ERR-030')
  if (!/^\d{1,20}$/.test(employeeId)) fail('ERR-031')
  if (!name)                          fail('ERR-032')
  if (name.length > 80)               fail('ERR-033')
  if (!/^\d{10,15}$/.test(phone))     fail('ERR-034')
  validarFormatoPin(pin)

  const yaExiste = readRows(SHEETS.PERSONAS)
    .some(p => String(p.employeeId) === employeeId)
  if (yaExiste) fail('ERR-013')

  const salt = makeSalt()
  const persona = {
    id:         'u-' + employeeId,
    employeeId: employeeId,
    name:       name,
    phone:      phone,
    initial:    name.charAt(0).toUpperCase(),
    createdAt:  new Date().toISOString(),
    status:     'pending',
    pinSalt:    salt,
    pinHash:    hashPin(pin, salt),
  }
  appendRow(SHEETS.PERSONAS, persona)
  return { token: emitirToken(persona.id, 'user'), persona: mapPersona(persona) }
}
