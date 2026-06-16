/**
 * Personas — empleados que registran compras.
 * Hoja "Personas": id | employeeId | name | phone | initial | createdAt
 */

function mapPersona(p) {
  return {
    id:         String(p.id),
    employeeId: String(p.employeeId),
    name:       String(p.name),
    phone:      String(p.phone),
    initial:    String(p.initial || (p.name ? p.name.charAt(0).toUpperCase() : '?')),
  }
}

function listPersonas() {
  return readRows(SHEETS.PERSONAS).map(mapPersona)
}

function createPersona(data) {
  const employeeId = String(data.employeeId || '').trim()
  const name       = String(data.name || '').trim()
  const phone      = String(data.phone || '').trim()

  if (!employeeId) throw new Error('Falta el número de empleado')
  if (!name)       throw new Error('Falta el nombre')
  if (phone.length < 10) throw new Error('El teléfono debe tener al menos 10 dígitos')

  const yaExiste = readRows(SHEETS.PERSONAS)
    .some(p => String(p.employeeId) === employeeId)
  if (yaExiste) throw new Error('Ese número de empleado ya está registrado')

  const persona = {
    id:         'u-' + employeeId,
    employeeId: employeeId,
    name:       name,
    phone:      phone,
    initial:    name.charAt(0).toUpperCase(),
    createdAt:  new Date().toISOString(),
  }
  appendRow(SHEETS.PERSONAS, persona)
  return mapPersona(persona)
}
