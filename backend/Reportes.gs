/**
 * Reportes — totales agregados en un rango de fechas.
 * GET ?action=getResumen&fecha_inicio=ISO&fecha_fin=ISO
 *
 * Ambas fechas son opcionales: sin ellas, resume todas las compras.
 *
 * Los totales se clasifican por el método EFECTIVO, igual que el frontend
 * (frontend/src/data.js → effectiveMethod): una compra fiada ya saldada cuenta
 * según el método con que se pagó; si sigue pendiente, cuenta como deuda.
 */

/** Método efectivo de una compra. Espejo de effectiveMethod() del frontend. */
function metodoEfectivo(c) {
  const method = String(c.method || '')
  const paid   = c.paidMethod ? String(c.paidMethod) : ''
  return method === 'debt' && paid ? paid : method
}

function getResumen(data) {
  const inicio = data.fecha_inicio ? new Date(data.fecha_inicio) : null
  const fin    = data.fecha_fin    ? new Date(data.fecha_fin)    : null
  if (inicio && isNaN(inicio.getTime())) fail('ERR-070')
  if (fin    && isNaN(fin.getTime()))    fail('ERR-071')

  const precioPorId = {}
  readRows(SHEETS.PRODUCTOS).forEach(p => { precioPorId[String(p.id)] = Number(p.price) || 0 })

  let total = 0, efectivo = 0, transferencia = 0, deuda = 0, lineas = 0
  // Una compra del frontend se guarda como varias filas (una por producto). Para
  // contar "compras" y no "líneas" agrupamos por persona + fecha, que es lo que
  // comparten las filas creadas en un mismo createCompra().
  const comprasVistas = {}

  readRows(SHEETS.COMPRAS).forEach(c => {
    const fecha = new Date(c.date)
    if (isNaN(fecha.getTime())) return
    if (inicio && fecha < inicio) return
    if (fin && fecha > fin) return

    // Usa el precio congelado de la compra; si no hay (compras viejas), el actual.
    const unit = Number(c.unitPrice) || precioPorId[String(c.productId)] || 0
    const monto = unit * (Number(c.quantity) || 0)
    const metodo = metodoEfectivo(c)

    total += monto
    if (metodo === 'cash')     efectivo      += monto
    if (metodo === 'transfer') transferencia += monto
    if (metodo === 'debt')     deuda         += monto

    lineas++
    comprasVistas[String(c.personId) + '|' + toIso(c.date)] = true
  })

  return {
    total:         total,
    cash:          efectivo,
    transfer:      transferencia,
    debt:          deuda,
    count:         Object.keys(comprasVistas).length,
    lineCount:     lineas,
    fecha_inicio:  inicio ? inicio.toISOString() : null,
    fecha_fin:     fin ? fin.toISOString() : null,
  }
}
