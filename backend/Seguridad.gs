/**
 * Seguridad — PINs, tokens de sesión y control de intentos.
 * Hoja "Seguridad": clave | valor   (formato clave/valor)
 *
 * Claves usadas:
 *   pinHash / pinSalt  → PIN del panel de Marianita (nunca en texto plano)
 *   sessionSecret      → secreto HMAC con el que se firman los tokens
 *   pin                → LEGADO: PIN en claro. Si aparece, se migra a hash y se borra.
 *
 * Ningún PIN sale nunca del servidor: el cliente envía el PIN tecleado y recibe
 * un token firmado, que es lo único que viaja en las peticiones posteriores.
 */

const SESSION_TTL_MS   = 12 * 60 * 60 * 1000  // 12 h, igual que la sesión del frontend
const MAX_INTENTOS_PIN = 5                    // intentos fallidos antes de bloquear
const BLOQUEO_PIN_SEG  = 15 * 60              // duración del bloqueo

// ─── Config clave/valor ─────────────────────────────────────────────────────

function getConfig(clave) {
  const fila = readRows(SHEETS.SEGURIDAD).filter(r => String(r.clave) === clave)[0]
  return fila ? String(fila.valor) : null
}

function setConfig(clave, valor) {
  const sh = getSheet(SHEETS.SEGURIDAD)
  const values = sh.getDataRange().getValues()
  for (let r = 1; r < values.length; r++) {
    if (String(values[r][0]) === clave) {
      sh.getRange(r + 1, 2).setValue(valor)
      return valor
    }
  }
  sh.appendRow([clave, valor])
  return valor
}

function deleteConfig(clave) {
  const sh = getSheet(SHEETS.SEGURIDAD)
  const values = sh.getDataRange().getValues()
  for (let r = values.length - 1; r >= 1; r--) {
    if (String(values[r][0]) === clave) sh.deleteRow(r + 1)
  }
}

// ─── Hash de PIN ────────────────────────────────────────────────────────────
// El PIN nunca se guarda en texto plano: se almacena hash SHA-256 de (salt:pin).
// NOTA: un PIN de 4 dígitos son 10.000 combinaciones, así que el hash por sí solo
// no resiste fuerza bruta offline. La defensa real es el límite de intentos de
// abajo y el hecho de que la hoja no sea pública.

function makeSalt() {
  return Utilities.getUuid()
}

function toHex(bytes) {
  return bytes.map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2) }).join('')
}

function hashPin(pin, salt) {
  return toHex(Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(salt) + ':' + String(pin),
    Utilities.Charset.UTF_8
  ))
}

/** Comparación en tiempo constante: no filtra cuántos caracteres coincidían. */
function equalsSeguro(a, b) {
  const x = String(a), y = String(b)
  if (x.length !== y.length) return false
  let diff = 0
  for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i)
  return diff === 0
}

function validarFormatoPin(pin) {
  if (!/^\d{4}$/.test(String(pin || ''))) fail('ERR-020')
  return String(pin)
}

// ─── Límite de intentos ─────────────────────────────────────────────────────
// Se guarda en CacheService (volátil a propósito: el bloqueo caduca solo).

function claveIntentos(scope) {
  return 'pinfail:' + String(scope)
}

function assertNoBloqueado(scope) {
  const cache = CacheService.getScriptCache()
  const n = Number(cache.get(claveIntentos(scope)) || 0)
  if (n >= MAX_INTENTOS_PIN) {
    fail('ERR-024')
  }
}

function registrarFallo(scope) {
  const cache = CacheService.getScriptCache()
  const key = claveIntentos(scope)
  const n = Number(cache.get(key) || 0) + 1
  cache.put(key, String(n), BLOQUEO_PIN_SEG)
}

function limpiarFallos(scope) {
  CacheService.getScriptCache().remove(claveIntentos(scope))
}

// ─── PIN del panel de Marianita ─────────────────────────────────────────────

/**
 * Verifica el PIN de admin. Si la hoja aún tiene el PIN legado en texto plano,
 * lo migra a hash de forma transparente en el primer acceso correcto.
 */
function verificarPinAdmin(pin) {
  const legado = getConfig('pin')
  if (legado) {
    if (!equalsSeguro(String(pin), legado)) return false
    const salt = makeSalt()
    setConfig('pinSalt', salt)
    setConfig('pinHash', hashPin(pin, salt))
    deleteConfig('pin')
    return true
  }
  const hash = getConfig('pinHash')
  const salt = getConfig('pinSalt')
  if (!hash || !salt) fail('ERR-027')
  return equalsSeguro(hashPin(pin, salt), hash)
}

/** Cambia el PIN de admin. Requiere conocer el actual. */
function changeAdminPin(data) {
  const actual = String(data.currentPin || '')
  const nuevo  = validarFormatoPin(data.newPin)
  assertNoBloqueado('admin')
  if (!verificarPinAdmin(actual)) {
    registrarFallo('admin')
    fail('ERR-026')
  }
  limpiarFallos('admin')
  const salt = makeSalt()
  setConfig('pinSalt', salt)
  setConfig('pinHash', hashPin(nuevo, salt))
  deleteConfig('pin')
  return { ok: true }
}

// ─── Tokens de sesión (HMAC) ────────────────────────────────────────────────
// Token = base64url(payload JSON) + '.' + base64url(HMAC-SHA256(payload, secreto)).
// Sin estado en Sheets: validar un token no cuesta lecturas extra.

function getSessionSecret() {
  let secret = getConfig('sessionSecret')
  if (!secret) {
    secret = Utilities.getUuid() + Utilities.getUuid()
    setConfig('sessionSecret', secret)
  }
  return secret
}

// Se conserva el relleno '=' a propósito: base64DecodeWebSafe no garantiza aceptar
// cadenas sin él, y el token siempre viaja escapado (URLSearchParams / JSON).
function b64url(s) {
  return Utilities.base64EncodeWebSafe(s)
}

function firmar(payloadB64) {
  return b64url(Utilities.computeHmacSha256Signature(payloadB64, getSessionSecret()))
}

/** Emite un token. `role` es 'user' o 'admin'; `sub` el id de persona (vacío en admin). */
function emitirToken(sub, role) {
  const payload = JSON.stringify({ sub: String(sub || ''), role: role, exp: Date.now() + SESSION_TTL_MS })
  const p = b64url(payload)
  return p + '.' + firmar(p)
}

/**
 * Valida un token y devuelve { sub, role, exp }. Lanza si falta, está manipulado
 * o caducó. No consulta la hoja de Personas: eso lo hace quien lo necesite.
 */
function leerToken(token) {
  const raw = String(token || '')
  if (!raw) fail('ERR-001')
  const partes = raw.split('.')
  if (partes.length !== 2) fail('ERR-002')
  if (!equalsSeguro(firmar(partes[0]), partes[1])) fail('ERR-002')

  let payload
  try {
    payload = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(partes[0])).getDataAsString())
  } catch (err) {
    fail('ERR-002')
  }
  if (!payload || Number(payload.exp) < Date.now()) fail('ERR-003')
  return payload
}
