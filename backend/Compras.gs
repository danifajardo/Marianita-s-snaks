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

function listCompras(data) {
  let compras = readRows(SHEETS.COMPRAS).map(mapCompra)
  if (data && data.personId) {
    const personId = String(data.personId)
    compras = compras.filter(c => c.personId === personId)
  }
  // Más recientes primero, igual que en el frontend.
  return compras.sort((a, b) => new Date(b.date) - new Date(a.date))
}

function createCompra(data) {
  const personId = String(data.personId || '')
  const method   = String(data.method || '')
  const items    = Array.isArray(data.items) ? data.items : []

  if (!personId) throw new Error('Falta la persona')
  if (['cash', 'transfer', 'debt'].indexOf(method) === -1) throw new Error('Método de pago inválido')
  if (items.length === 0) throw new Error('No hay productos en la compra')

  // Precio actual de cada producto, para congelarlo en la compra.
  const precioPorId = {}
  readRows(SHEETS.PRODUCTOS).forEach(p => { precioPorId[String(p.id)] = Number(p.price) || 0 })

  const date = new Date().toISOString()
  const stamp = Date.now()

  const creadas = items.map((item, i) => ({
    id:         'c-' + stamp + '-' + i,
    personId:   personId,
    productId:  String(item.productId),
    quantity:   Number(item.quantity) || 1,
    unitPrice:  precioPorId[String(item.productId)] || 0,
    method:     method,
    date:       date,
    paidMethod: '',
    paidDate:   '',
  }))

  creadas.forEach(c => appendRow(SHEETS.COMPRAS, c))
  return creadas.map(mapCompra)
}

// Salda una o varias compras fiadas de una sola vez (pagar por compra o todo de golpe).
function settleCompras(data) {
  const ids = Array.isArray(data.ids) ? data.ids : (data.id ? [data.id] : [])
  const paidMethod = String(data.paidMethod || '')
  if (ids.length === 0) throw new Error('No hay compras para saldar')
  if (paidMethod !== 'cash' && paidMethod !== 'transfer') throw new Error('Método de pago inválido')

  const paidDate = new Date().toISOString()
  return ids.map(id => mapCompra(updateRowById(SHEETS.COMPRAS, String(id), {
    paidMethod: paidMethod,
    paidDate:   paidDate,
  })))
}
