/**
 * Seguridad — configuración sensible (PIN del panel de Marianita).
 * Hoja "Seguridad": clave | valor   (formato clave/valor)
 *
 * El PIN vive SOLO aquí, en el servidor. El frontend nunca lo conoce: envía el
 * PIN tecleado y este endpoint responde si es válido o no.
 */

function getConfig(clave) {
  const fila = readRows(SHEETS.SEGURIDAD).filter(r => String(r.clave) === clave)[0]
  return fila ? String(fila.valor) : null
}

function verifyPin(data) {
  const pin  = String(data.pin || '')
  const real = String(getConfig('pin') || '')
  return { valid: pin !== '' && pin === real }
}
