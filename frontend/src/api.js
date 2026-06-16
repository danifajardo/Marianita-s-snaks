const BASE = import.meta.env.VITE_API_URL

// --- Cliente RPC (Google Apps Script) ---
// Apps Script solo expone doGet/doPost y no responde el preflight CORS (OPTIONS).
// Por eso todo se enruta por un parámetro `action`: las lecturas van por GET y las
// escrituras por POST con Content-Type text/plain (así el navegador no dispara el
// preflight). El backend responde un sobre { ok, data } o { ok:false, error }.

async function rpcGet(action, params = {}) {
  const qs = new URLSearchParams({ action, ...params })
  const res = await fetch(`${BASE}?${qs}`)
  return unwrap(await res.json())
}

async function rpcPost(action, payload = {}) {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, ...payload }),
  })
  return unwrap(await res.json())
}

function unwrap(body) {
  if (!body || body.ok === false) throw new Error(body?.error || 'Error en la petición')
  return body.data
}

// --- Personas ---

export async function getPersonas() {
  const data = await rpcGet('getPersonas')
  return data.map(normalizePersona)
}

export async function postPersona(body) {
  return normalizePersona(await rpcPost('createPersona', body))
}

function normalizePersona(p) {
  return { ...p, initial: p.initial ?? p.name?.charAt(0).toUpperCase() ?? '?' }
}

// --- Productos ---

export async function getProductos() {
  return rpcGet('getProductos')
}

export async function postProducto(body) {
  return rpcPost('createProducto', body)
}

export async function patchProducto(id, body) {
  return rpcPost('updateProducto', { id, ...body })
}

// --- Compras ---

export async function getCompras(personId) {
  return rpcGet('getCompras', personId ? { personId } : {})
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

// --- Auth ---

export async function verificarPin(pin) {
  try {
    const { valid } = await rpcPost('verifyPin', { pin })
    return !!valid
  } catch {
    return false
  }
}

// --- Reportes ---

export async function getResumen({ fechaInicio, fechaFin }) {
  return rpcGet('getResumen', { fecha_inicio: fechaInicio, fecha_fin: fechaFin })
}
