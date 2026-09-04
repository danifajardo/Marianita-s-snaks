/**
 * Compras — cada fila es una línea de compra (un producto).
 * Hoja "Compras": id | personId | productId | quantity | method | date | paidMethod | paidDate
 *
 * El frontend envía una compra agrupada { personId, method, items[] } y aquí se
 * desglosa en una fila por ítem, devolviendo el arreglo de filas creadas.
 *
 * Una compra fiada (method === 'debt') se salda registrando paidMethod
 * (cash | transfer) y paidDate; mientras esos campos estén vacíos sigue pendiente.
 */

// Topes defensivos: el endpoint es público, así que una petición manipulada no debe
// poder inflar el stock ni llenar la hoja de una sola vez.
const MAX_CANTIDAD_POR_ITEM = 100
const MAX_ITEMS_POR_COMPRA  = 50

function toIso(v) {
  if (!v) return ''
  return v instanceof Date ? v.toISOString() : String(v)
}

function mapCompra(c) {
  return {
    id:         String(c.id),
    personId:   String(c.personId),
    productId:  String(c.productId),
    quantity:   Number(c.quantity) || 0,
    unitPrice:  Number(c.unitPrice) || 0,
    method:     String(c.method),
    date:       toIso(c.date),
    paidMethod: c.paidMethod ? String(c.paidMethod) : '',
    paidDate:   toIso(c.paidDate),
  }
}

/**
 * Compras visibles para quien llama: Mari ve todas (opcionalmente filtradas por
 * personId); un empleado solo ve las suyas, sin importar qué personId pida.
 */
function listCompras(data, ctx) {
  let compras = readRows(SHEETS.COMPRAS).map(mapCompra)
  const esAdmin = ctx && ctx.role === 'admin'
  const personId = esAdmin ? String((data && data.personId) || '') : String(ctx.sub)
  if (personId) {
    compras = compras.filter(c => c.personId === personId)
  }
  // Más recientes primero, igual que en el frontend.
  return compras.sort((a, b) => new Date(b.date) - new Date(a.date))
}

function createCompra(data, ctx) {
  // La compra SIEMPRE se registra a nombre de quien tiene la sesión: si tomáramos
  // data.personId, cualquiera podría cargarle compras a otro empleado.
  const esAdmin  = ctx && ctx.role === 'admin'
  const personId = esAdmin ? String(data.personId || '') : String(assertPersonaActiva(ctx).id)
  const method   = String(data.method || '')
  const items    = Array.isArray(data.items) ? data.items : []

  if (!personId) fail('ERR-050')
  if (['cash', 'transfer', 'debt'].indexOf(method) === -1) fail('ERR-051')
  if (items.length === 0) fail('ERR-052')
  if (items.length > MAX_ITEMS_POR_COMPRA) fail('ERR-053', { max: MAX_ITEMS_POR_COMPRA })

  // Sin esta validación una cantidad negativa generaría totales negativos y, peor,
  // *aumentaría* el stock al descontarse más abajo.
  items.forEach(function (item) {
    const q = Number(item.quantity)
    if (!isFinite(q) || q <= 0 || Math.floor(q) !== q) {
      fail('ERR-054', { productId: String(item.productId) })
    }
    if (q > MAX_CANTIDAD_POR_ITEM) {
      fail('ERR-055', { productId: String(item.productId), max: MAX_CANTIDAD_POR_ITEM })
    }
  })

  // Producto actual por id: para congelar precio y descontar stock.
  const prodById = {}
  readRows(SHEETS.PRODUCTOS).forEach(p => { prodById[String(p.id)] = p })

  const date = new Date().toISOString()
  const stamp = Date.now()

  const creadas = items.map((item, i) => {
    const prod = prodById[String(item.productId)]
    // Un id inexistente se guardaba con unitPrice 0 y el frontend lo ocultaba en silencio.
    if (!prod) fail('ERR-044', { productId: String(item.productId) })
    return {
      id:         'c-' + stamp + '-' + i,
      personId:   personId,
      productId:  String(item.productId),
      quantity:   Number(item.quantity),
      unitPrice:  Number(prod.price) || 0,
      method:     method,
      date:       date,
      paidMethod: '',
      paidDate:   '',
    }
  })

  // Una sola escritura para todas las líneas de la compra.
  appendRows(SHEETS.COMPRAS, creadas)

  // Descuenta stock por producto (se permite quedar en negativo: "permitir y avisar").
  const qtyPorId = {}
  creadas.forEach(c => { qtyPorId[c.productId] = (qtyPorId[c.productId] || 0) + c.quantity })
  const parchesStock = {}
  Object.keys(qtyPorId).forEach(pid => {
    const prod = prodById[pid]
    parchesStock[pid] = { stock: (Math.trunc(Number(prod.stock) || 0)) - qtyPorId[pid] }
  })
  updateRowsById(SHEETS.PRODUCTOS, parchesStock)

  return creadas.map(mapCompra)
}

// Salda una o varias compras fiadas de una sola vez (pagar por compra o todo de golpe).
function settleCompras(data, ctx) {
  const esAdmin = ctx && ctx.role === 'admin'
  const propio  = esAdmin ? null : String(assertPersonaActiva(ctx).id)
  const ids = Array.isArray(data.ids) ? data.ids : (data.id ? [data.id] : [])
  const paidMethod = String(data.paidMethod || '')
  if (ids.length === 0) fail('ERR-056')
  if (paidMethod !== 'cash' && paidMethod !== 'transfer') fail('ERR-051')

  // Solo se puede saldar una compra fiada que siga pendiente: sin esto se podía
  // "pagar" una compra en efectivo o volver a pagar una deuda ya saldada.
  const compraPorId = {}
  readRows(SHEETS.COMPRAS).forEach(c => { compraPorId[String(c.id)] = c })
  ids.forEach(id => {
    const c = compraPorId[String(id)]
    if (!c) fail('ERR-057', { id: String(id) })
    // Un empleado solo puede saldar sus propias deudas.
    if (propio && String(c.personId) !== propio) fail('ERR-060', { id: String(id) })
    if (String(c.method) !== 'debt') fail('ERR-058', { id: String(id) })
    if (c.paidMethod) fail('ERR-059', { id: String(id) })
  })

  const paidDate = new Date().toISOString()
  // Una sola lectura de la hoja para todos los ids, en vez de una por id.
  const parches = {}
  ids.forEach(id => { parches[String(id)] = { paidMethod: paidMethod, paidDate: paidDate } })
  const actualizadas = updateRowsById(SHEETS.COMPRAS, parches)
  return ids.map(id => mapCompra(actualizadas[String(id)]))
}
