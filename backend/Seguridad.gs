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

// ─── Hash de PIN por usuario ────────────────────────────────────────────────
// El PIN nunca se guarda en texto plano: se almacena hash SHA-256 de (salt:pin).

function makeSalt() {
  return Utilities.getUuid()
}

function hashPin(pin, salt) {
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(salt) + ':' + String(pin),
    Utilities.Charset.UTF_8
  )
  return bytes.map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2) }).join('')
}
