/**
 * Reportes — totales agregados en un rango de fechas.
 * GET ?action=getResumen&fecha_inicio=ISO&fecha_fin=ISO
 *
 * Ambas fechas son opcionales: sin ellas, resume todas las compras.
 */

function getResumen(data) {
  const inicio = data.fecha_inicio ? new Date(data.fecha_inicio) : null
  const fin    = data.fecha_fin    ? new Date(data.fecha_fin)    : null

  const precioPorId = {}
  readRows(SHEETS.PRODUCTOS).forEach(p => { precioPorId[String(p.id)] = Number(p.price) || 0 })

  let total = 0, efectivo = 0, transferencia = 0, cantidad = 0

  readRows(SHEETS.COMPRAS).forEach(c => {
    const fecha = new Date(c.date)
    if (inicio && fecha < inicio) return
    if (fin && fecha > fin) return

    // Usa el precio congelado de la compra; si no hay (compras viejas), el actual.
    const unit = Number(c.unitPrice) || precioPorId[String(c.productId)] || 0
    const monto = unit * (Number(c.quantity) || 0)
    total += monto
    if (c.method === 'cash')     efectivo += monto
    if (c.method === 'transfer') transferencia += monto
    cantidad++
  })

  return {
    total:         total,
    cash:          efectivo,
    transfer:      transferencia,
    count:         cantidad,
    fecha_inicio:  inicio ? inicio.toISOString() : null,
    fecha_fin:     fin ? fin.toISOString() : null,
  }
}
