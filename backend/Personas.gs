/**
 * Personas — empleados que registran compras.
 * Hoja "Personas": id | employeeId | name | phone | initial | createdAt | status
 *
 * status: 'pending' (recién registrado, esperando aprobación de Mari) |
 *         'active' (aprobado, puede usar la app) | 'rejected' (rechazado).
 * Las personas creadas antes de esta función no tienen status → se asumen 'active'.
 */

// IMPORTANTE: nunca exponer pinHash/pinSalt al cliente. Solo se informa si tiene PIN.
function mapPersona(p) {
  return {
    id:         String(p.id),
    employeeId: String(p.employeeId),
    name:       String(p.name),
    phone:      String(p.phone),
    initial:    String(p.initial || (p.name ? p.name.charAt(0).toUpperCase() : '?')),
    status:     String(p.status || 'active'),
    hasPin:     !!String(p.pinHash || ''),
  }
}

function rawPersona(id) {
  return readRows(SHEETS.PERSONAS).filter(function (p) { return String(p.id) === String(id) })[0]
}

function listPersonas() {
  return readRows(SHEETS.PERSONAS).map(mapPersona)
}

// Valida el PIN de un usuario (no expone nada del hash).
function verifyUserPin(data) {
  const row = rawPersona(String(data.id || ''))
  if (!row) throw new Error('Persona no encontrada')
  const stored = String(row.pinHash || '')
  const ok = stored !== '' && hashPin(String(data.pin || ''), row.pinSalt) === stored
  return { valid: !!ok }
}

// Crea el PIN de un usuario que aún NO tiene (registro, reset o usuario viejo).
// No permite sobreescribir un PIN existente sin pasar por un reset de Mari.
function setUserPin(data) {
  const id  = String(data.id || '')
  const pin = String(data.pin || '').trim()
  if (!/^\d{4}$/.test(pin)) throw new Error('El PIN debe ser de 4 dígitos')
  const row = rawPersona(id)
  if (!row) throw new Error('Persona no encontrada')
  if (String(row.pinHash || '')) throw new Error('Esta persona ya tiene PIN')
  const salt = makeSalt()
  return mapPersona(updateRowById(SHEETS.PERSONAS, id, { pinSalt: salt, pinHash: hashPin(pin, salt) }))
}

// Resetea (borra) el PIN de un usuario — acción de Mari. Luego el usuario crea uno nuevo.
function resetUserPin(data) {
  const id = String(data.id || '')
  if (!id) throw new Error('Falta el id de la persona')
  return mapPersona(updateRowById(SHEETS.PERSONAS, id, { pinHash: '', pinSalt: '' }))
}

function setPersonaStatus(data) {
  const id = String(data.id || '')
  const status = String(data.status || '')
  if (!id) throw new Error('Falta el id de la persona')
  if (['pending', 'active', 'rejected', 'inactive'].indexOf(status) === -1) throw new Error('Estado inválido')
  return mapPersona(updateRowById(SHEETS.PERSONAS, id, { status: status }))
}

function createPersona(data) {
  const employeeId = String(data.employeeId || '').trim()
  const name       = String(data.name || '').trim()
  const phone      = String(data.phone || '').trim()

  const pin = String(data.pin || '').trim()
  if (!employeeId) throw new Error('Falta el número de empleado')
  if (!name)       throw new Error('Falta el nombre')
  if (phone.length < 10) throw new Error('El teléfono debe tener al menos 10 dígitos')
  if (!/^\d{4}$/.test(pin)) throw new Error('El PIN debe ser de 4 dígitos')

  const yaExiste = readRows(SHEETS.PERSONAS)
    .some(p => String(p.employeeId) === employeeId)
  if (yaExiste) throw new Error('Ese número de empleado ya está registrado')

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
  return mapPersona(persona)
}
