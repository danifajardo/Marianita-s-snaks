const BASE = import.meta.env.VITE_API_URL

// --- Cliente RPC (Google Apps Script) ---
// Apps Script solo expone doGet/doPost y no responde el preflight CORS (OPTIONS).
// Por eso todo se enruta por un parámetro `action`: las lecturas van por GET y las
// escrituras por POST con Content-Type text/plain (así el navegador no dispara el
// preflight). El backend responde un sobre { ok, data } o { ok:false, error }.
//
// Autenticación: el backend valida un token firmado en cada acción protegida.
// Hay dos, con alcances distintos:
//   - `userToken`  → identifica al empleado; se conserva entre recargas.
//   - `adminToken` → sesión del panel de Mari; NO se persiste, así que al recargar
//     hay que volver a teclear el PIN.

const TOKEN_KEY = 'dulceria.token'

let userToken = readStoredToken()
let adminToken = null

function readStoredToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || null
  } catch {
    return null
  }
}

export function getUserToken() {
  return userToken
}

/** Guarda (o borra, con null) el token de empleado. */
export function setUserToken(token) {
  userToken = token || null
  try {
    if (userToken) localStorage.setItem(TOKEN_KEY, userToken)
    else localStorage.removeItem(TOKEN_KEY)
  } catch { /* noop */ }
}

export function setAdminToken(token) {
  adminToken = token || null
}

export function hasAdminToken() {
  return !!adminToken
}

// `admin: true` usa la sesión de Mari; si no, la del empleado.
function tokenPara({ admin } = {}) {
  return admin ? adminToken : userToken
}

async function rpcGet(action, params = {}, opts = {}) {
  const token = tokenPara(opts)
  const qs = new URLSearchParams({ action, ...params, ...(token ? { token } : {}) })
  const res = await fetch(`${BASE}?${qs}`)
  return unwrap(await res.json())
}

async function rpcPost(action, payload = {}, opts = {}) {
  const token = tokenPara(opts)
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, ...payload, ...(token ? { token } : {}) }),
  })
  return unwrap(await res.json())
}

/**
 * Abre el sobre del backend. Si trae error, lanza un Error que conserva el
 * `code` (ERR-0xx) y los `params`: quien lo muestre lo traduce con
 * `errorText(err, t)` (ver `./errors`). El `message` en español queda como
 * respaldo si el frontend no conoce el código.
 */
function unwrap(body) {
  if (!body || body.ok === false) {
    const err = new Error(body?.error || 'Error en la petición')
    err.code = body?.code || 'ERR-000'
    err.params = body?.params || {}
    throw err
  }
  return body.data
}

// --- Personas ---

// Con `admin: true` el backend devuelve también a las personas inactivas/rechazadas
// y los teléfonos, que la lista pública ya no incluye.
export async function getPersonas(opts = {}) {
  const data = await rpcGet('getPersonas', {}, opts)
  return data.map(normalizePersona)
}

/**
 * Registro. El backend devuelve la persona (en estado 'pending') junto a su token,
 * que guardamos para dejarla con sesión iniciada.
 */
export async function postPersona(body) {
  const { token, persona } = await rpcPost('createPersona', body)
  setUserToken(token)
  return normalizePersona(persona)
}

// Cambia el estado de una persona: 'active' (aprobar) | 'rejected' | 'inactive'. Solo Mari.
export async function setPersonaStatus(id, status) {
  return normalizePersona(await rpcPost('setPersonaStatus', { id, status }, { admin: true }))
}

/**
 * Inicia sesión con el PIN y deja el token guardado. Lanza si algo falla: antes
 * se tragaba cualquier error y todo parecía "PIN incorrecto", así que el usuario
 * nunca se enteraba de un bloqueo por intentos (ERR-024) o de una cuenta
 * desactivada (ERR-011). Quien llame decide qué hacer según `err.code`.
 */
export async function loginUser(id, pin) {
  const { token, persona } = await rpcPost('login', { id, pin })
  setUserToken(token)
  return normalizePersona(persona)
}

// Crea el PIN de un usuario que aún no tiene (registro, reset o usuario viejo).
export async function setUserPin(id, pin) {
  const { token, persona } = await rpcPost('setUserPin', { id, pin })
  setUserToken(token)
  return normalizePersona(persona)
}

// Resetea (borra) el PIN de un usuario — acción de Mari.
export async function resetUserPin(id) {
  return normalizePersona(await rpcPost('resetUserPin', { id }, { admin: true }))
}

export function logoutUser() {
  setUserToken(null)
  setAdminToken(null)
}

function normalizePersona(p) {
  return { ...p, initial: p.initial ?? p.name?.charAt(0).toUpperCase() ?? '?' }
}

// --- Productos ---

export async function getProductos() {
  return rpcGet('getProductos')
}

export async function postProducto(body) {
  return rpcPost('createProducto', body, { admin: true })
}

export async function patchProducto(id, body) {
  return rpcPost('updateProducto', { id, ...body }, { admin: true })
}

// --- Compras ---

// Sin `admin` el backend devuelve solo las compras de quien tiene la sesión;
// el personId que se mande se ignora salvo que sea Mari.
export async function getCompras(personId, opts = {}) {
  return rpcGet('getCompras', personId ? { personId } : {}, opts)
}

export async function postCompra(body) {
  const data = await rpcPost('createCompra', body)
  return Array.isArray(data) ? data : [data]
}

// Salda una o varias compras fiadas registrando con qué método se pagaron (cash | transfer).
export async function settleCompras(ids, paidMethod) {
  const data = await rpcPost('settleCompras', { ids, paidMethod })
  return Array.isArray(data) ? data : [data]
}

// --- Auth de Marianita ---

/**
 * Verifica el PIN del panel. En caso de éxito guarda el token de admin en memoria
 * (no en localStorage: la sesión de Mari no debe sobrevivir a una recarga).
 * Lanza si el PIN falla, para poder distinguir "incorrecto" (ERR-025) de
 * "demasiados intentos" (ERR-024).
 */
export async function verificarPin(pin) {
  const { token } = await rpcPost('adminLogin', { pin })
  setAdminToken(token)
  return true
}

// --- Reportes ---

export async function getResumen({ fechaInicio, fechaFin }) {
  return rpcGet('getResumen', { fecha_inicio: fechaInicio, fecha_fin: fechaFin }, { admin: true })
}
