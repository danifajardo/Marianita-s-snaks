/**
 * Pruebas de la lógica de seguridad de Seguridad.gs (hash de PIN, tokens de
 * sesión, migración del PIN legado y límite de intentos).
 *
 * Apps Script no se puede ejecutar fuera de Google, así que aquí se cargan las
 * funciones reales del .gs sobre stubs mínimos de las APIs que usan (Utilities,
 * CacheService) y de la hoja "Seguridad", simulada como un Map en memoria.
 *
 * Ejecutar:  node backend/test/seguridad.test.js
 */
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const assert = require('assert')

const BACKEND = path.join(__dirname, '..')

// --- Stubs de Apps Script -------------------------------------------------
const Utilities = {
  DigestAlgorithm: { SHA_256: 'SHA-256' },
  Charset: { UTF_8: 'utf8' },
  getUuid: () => crypto.randomUUID(),
  computeDigest: (algo, value) =>
    Array.from(crypto.createHash('sha256').update(String(value), 'utf8').digest())
      .map(b => (b > 127 ? b - 256 : b)),          // Apps Script devuelve bytes con signo
  computeHmacSha256Signature: (value, key) =>
    Array.from(crypto.createHmac('sha256', String(key)).update(String(value), 'utf8').digest())
      .map(b => (b > 127 ? b - 256 : b)),
  base64EncodeWebSafe: (v) => {
    const buf = Array.isArray(v)
      ? Buffer.from(v.map(b => (b < 0 ? b + 256 : b)))
      : Buffer.from(String(v), 'utf8')
    return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_')
  },
  base64DecodeWebSafe: (s) =>
    Array.from(Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64'))
      .map(b => (b > 127 ? b - 256 : b)),
  newBlob: (bytes) => ({
    getDataAsString: () => Buffer.from(bytes.map(b => (b < 0 ? b + 256 : b))).toString('utf8'),
  }),
}

const cacheStore = new Map()
const CacheService = {
  getScriptCache: () => ({
    get: (k) => (cacheStore.has(k) ? cacheStore.get(k) : null),
    put: (k, v) => cacheStore.set(k, v),
    remove: (k) => cacheStore.delete(k),
  }),
}

// Hoja "Seguridad" simulada como clave/valor en memoria.
const config = new Map()
const SHEETS = { SEGURIDAD: 'Seguridad' }
const readRows = () => Array.from(config, ([clave, valor]) => ({ clave, valor }))
const getSheet = () => { throw new Error('no usado en este arnés') }

// setConfig/deleteConfig del .gs hablan con la hoja; aquí los sustituimos.
const overrides = `
function setConfig(clave, valor) { config.set(clave, String(valor)); return valor }
function deleteConfig(clave) { config.delete(clave) }
`

// --- Carga del código real -------------------------------------------------
// Errores.gs define fail()/ERRORES, de los que Seguridad.gs depende.
const errores = fs.readFileSync(path.join(BACKEND, 'Errores.gs'), 'utf8')
let src = [errores, fs.readFileSync(path.join(BACKEND, 'Seguridad.gs'), 'utf8')].join('\n')
// Quitamos las dos funciones que tocan la hoja; las reemplaza `overrides`.
src = src.replace(/function setConfig\(clave, valor\) \{[\s\S]*?\n\}\n/, '')
src = src.replace(/function deleteConfig\(clave\) \{[\s\S]*?\n\}\n/, '')

const factory = new Function(
  'Utilities', 'CacheService', 'readRows', 'getSheet', 'SHEETS', 'config',
  src + overrides + '\nreturn { hashPin, makeSalt, equalsSeguro, validarFormatoPin, emitirToken, leerToken, getSessionSecret, verificarPinAdmin, changeAdminPin, assertNoBloqueado, registrarFallo, limpiarFallos, b64url, firmar, MAX_INTENTOS_PIN, ERRORES, fail }'
)
const S = factory(Utilities, CacheService, readRows, getSheet, SHEETS, config)

// --- Pruebas ---------------------------------------------------------------
let pasos = 0
const check = (nombre, fn) => {
  fn()
  pasos++
  console.log('  ok  ' + nombre)
}
// Se comprueba el código del catálogo, no el texto: el texto lo traduce el frontend.
const lanza = (fn, code) => {
  try { fn() } catch (e) {
    assert.equal(e.code, code, `esperaba ${code} y llegó ${e.code} (${e.message})`)
    return
  }
  assert.fail(`se esperaba una excepción ${code}`)
}

console.log('\nHash de PIN')
check('mismo pin + mismo salt → mismo hash', () => {
  const salt = S.makeSalt()
  assert.equal(S.hashPin('1234', salt), S.hashPin('1234', salt))
})
check('mismo pin + distinto salt → distinto hash', () => {
  assert.notEqual(S.hashPin('1234', S.makeSalt()), S.hashPin('1234', S.makeSalt()))
})
check('pin distinto → hash distinto', () => {
  const salt = S.makeSalt()
  assert.notEqual(S.hashPin('1234', salt), S.hashPin('1235', salt))
})
check('el hash es hex de 64 caracteres', () => {
  assert.match(S.hashPin('1234', S.makeSalt()), /^[0-9a-f]{64}$/)
})

console.log('\nComparación segura')
check('iguales → true', () => assert.equal(S.equalsSeguro('abc', 'abc'), true))
check('distintos → false', () => assert.equal(S.equalsSeguro('abc', 'abd'), false))
check('distinta longitud → false', () => assert.equal(S.equalsSeguro('abc', 'abcd'), false))

console.log('\nFormato de PIN')
check('acepta 4 dígitos', () => assert.equal(S.validarFormatoPin('0042'), '0042'))
check('rechaza 3 dígitos', () => lanza(() => S.validarFormatoPin('123'), 'ERR-020'))
check('rechaza no numérico', () => lanza(() => S.validarFormatoPin('12a4'), 'ERR-020'))
check('rechaza vacío', () => lanza(() => S.validarFormatoPin(''), 'ERR-020'))

console.log('\nTokens')
check('ida y vuelta conserva sub y role', () => {
  const p = S.leerToken(S.emitirToken('u-42', 'user'))
  assert.equal(p.sub, 'u-42')
  assert.equal(p.role, 'user')
})
check('token de admin conserva el rol', () => {
  assert.equal(S.leerToken(S.emitirToken('', 'admin')).role, 'admin')
})
check('token vacío → No autenticado', () => lanza(() => S.leerToken(''), 'ERR-001'))
check('token sin firma → Sesión inválida', () => lanza(() => S.leerToken('abc'), 'ERR-002'))
check('payload manipulado → Sesión inválida', () => {
  const t = S.emitirToken('u-1', 'user')
  const falso = S.b64url(JSON.stringify({ sub: 'u-1', role: 'admin', exp: Date.now() + 1e6 }))
  lanza(() => S.leerToken(falso + '.' + t.split('.')[1]), 'ERR-002')
})
check('escalada a admin reusando firma ajena → Sesión inválida', () => {
  const user = S.emitirToken('u-1', 'user')
  const admin = S.emitirToken('', 'admin')
  lanza(() => S.leerToken(admin.split('.')[0] + '.' + user.split('.')[1]), 'ERR-002')
})
check('firma alterada → Sesión inválida', () => {
  const [p, sig] = S.emitirToken('u-1', 'user').split('.')
  lanza(() => S.leerToken(p + '.' + sig.slice(0, -1) + (sig.slice(-1) === 'A' ? 'B' : 'A')), 'ERR-002')
})
check('token auténtico pero caducado → Sesión expirada', () => {
  // Firmado con el secreto real: la firma cuadra, lo único inválido es la fecha.
  const p = S.b64url(JSON.stringify({ sub: 'u-1', role: 'user', exp: Date.now() - 1000 }))
  lanza(() => S.leerToken(p + '.' + S.firmar(p)), 'ERR-003')
})
check('token que caduca dentro de un rato sigue siendo válido', () => {
  const p = S.b64url(JSON.stringify({ sub: 'u-1', role: 'user', exp: Date.now() + 60000 }))
  assert.equal(S.leerToken(p + '.' + S.firmar(p)).sub, 'u-1')
})
check('otro secreto no valida el token', () => {
  const t = S.emitirToken('u-1', 'user')
  config.set('sessionSecret', 'secreto-distinto')
  lanza(() => S.leerToken(t), 'ERR-002')
})

console.log('\nPIN de admin')
config.clear()
cacheStore.clear()
check('migra el PIN legado en claro a hash y lo borra', () => {
  config.set('pin', '1234')
  assert.equal(S.verificarPinAdmin('1234'), true)
  assert.equal(config.has('pin'), false, 'el pin en claro debe desaparecer')
  assert.ok(config.get('pinHash'), 'debe quedar el hash')
  assert.equal(S.verificarPinAdmin('1234'), true, 'sigue validando tras migrar')
  assert.equal(S.verificarPinAdmin('9999'), false)
})
check('PIN legado incorrecto no migra nada', () => {
  config.clear()
  config.set('pin', '1234')
  assert.equal(S.verificarPinAdmin('0000'), false)
  assert.equal(config.get('pin'), '1234', 'el legado sigue intacto')
})
check('sin PIN configurado lanza error explicativo', () => {
  config.clear()
  lanza(() => S.verificarPinAdmin('1234'), 'ERR-027')
})
check('changeAdminPin exige el PIN actual', () => {
  config.clear(); cacheStore.clear()
  const salt = S.makeSalt()
  config.set('pinSalt', salt)
  config.set('pinHash', S.hashPin('1111', salt))
  lanza(() => S.changeAdminPin({ currentPin: '9999', newPin: '2222' }), 'ERR-026')
  S.changeAdminPin({ currentPin: '1111', newPin: '2222' })
  assert.equal(S.verificarPinAdmin('2222'), true)
  assert.equal(S.verificarPinAdmin('1111'), false)
})

console.log('\nLímite de intentos')
check('bloquea tras MAX_INTENTOS_PIN fallos', () => {
  cacheStore.clear()
  for (let i = 0; i < S.MAX_INTENTOS_PIN; i++) {
    S.assertNoBloqueado('user:x')   // aún permitido
    S.registrarFallo('user:x')
  }
  lanza(() => S.assertNoBloqueado('user:x'), 'ERR-024')
})
check('un login correcto limpia el contador', () => {
  S.limpiarFallos('user:x')
  S.assertNoBloqueado('user:x')
})
check('el bloqueo es por usuario, no global', () => {
  cacheStore.clear()
  for (let i = 0; i < S.MAX_INTENTOS_PIN; i++) S.registrarFallo('user:a')
  lanza(() => S.assertNoBloqueado('user:a'), 'ERR-024')
  S.assertNoBloqueado('user:b')
})

console.log('\nCatálogo de errores')
check('todos los códigos tienen la forma ERR-000', () => {
  Object.keys(S.ERRORES).forEach(c => assert.match(c, /^ERR-\d{3}$/))
})
check('todos los códigos tienen texto de respaldo en español', () => {
  Object.entries(S.ERRORES).forEach(([c, txt]) =>
    assert.ok(txt && txt.length > 3, `${c} sin texto`))
})
check('fail() adjunta el código y los parámetros a la excepción', () => {
  try { S.fail('ERR-055', { max: 100 }) } catch (e) {
    assert.equal(e.code, 'ERR-055')
    assert.deepEqual(e.params, { max: 100 })
    assert.equal(e.message, S.ERRORES['ERR-055'])
    return
  }
  assert.fail('fail() debe lanzar')
})
check('fail() sin parámetros no inventa params', () => {
  try { S.fail('ERR-001') } catch (e) {
    assert.equal(e.code, 'ERR-001')
    assert.equal(e.params, undefined)
    return
  }
  assert.fail('fail() debe lanzar')
})

console.log(`\n${pasos} comprobaciones OK\n`)
