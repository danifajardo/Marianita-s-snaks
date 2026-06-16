/**
 * Productos — catálogo de snacks.
 * Hoja "Productos": id | name | emoji | price | active
 */

function toBool(v) {
  return v === true || v === 'TRUE' || v === 'true' || v === 1 || v === '1'
}

function mapProducto(p) {
  return {
    id:     String(p.id),
    name:   String(p.name),
    emoji:  String(p.emoji || '🍬'),
    price:  Number(p.price) || 0,
    active: toBool(p.active),
  }
}

function listProductos() {
  return readRows(SHEETS.PRODUCTOS).map(mapProducto)
}

function createProducto(data) {
  const name = String(data.name || '').trim()
  const price = parseInt(String(data.price).replace(/\D/g, ''), 10)
  if (!name) throw new Error('Falta el nombre del producto')
  if (isNaN(price) || price <= 0) throw new Error('Precio inválido')

  const producto = {
    id:     'p-' + Date.now(),
    name:   name,
    emoji:  String(data.emoji || '🍬'),
    price:  price,
    active: data.active === undefined ? true : toBool(data.active),
  }
  appendRow(SHEETS.PRODUCTOS, producto)
  return mapProducto(producto)
}

function updateProducto(data) {
  const id = String(data.id || '')
  if (!id) throw new Error('Falta el id del producto')

  const patch = {}
  if (data.price !== undefined) {
    const price = parseInt(String(data.price).replace(/\D/g, ''), 10)
    if (isNaN(price) || price <= 0) throw new Error('Precio inválido')
    patch.price = price
  }
  if (data.active !== undefined) patch.active = toBool(data.active)
  if (data.name !== undefined)   patch.name = String(data.name).trim()
  if (data.emoji !== undefined)  patch.emoji = String(data.emoji)

  if (Object.keys(patch).length === 0) throw new Error('Nada que actualizar')

  return mapProducto(updateRowById(SHEETS.PRODUCTOS, id, patch))
}
