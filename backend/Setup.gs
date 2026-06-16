/**
 * Setup — ejecutar UNA vez desde el editor de Apps Script (función setupSpreadsheet).
 *
 * Crea las hojas con sus cabeceras y formatos, siembra el catálogo inicial de
 * productos y un PIN por defecto. Es idempotente: si una hoja ya existe, no la
 * recrea ni borra datos (salvo que uses los helpers de reseteo del final).
 */

// Definición de cada hoja: cabeceras y columnas que deben guardarse como TEXTO
// (para no perder ceros a la izquierda en IDs/teléfonos ni convertir a número).
const SHEET_DEFS = {
  Personas: {
    headers: ['id', 'employeeId', 'name', 'phone', 'initial', 'createdAt'],
    textCols: ['id', 'employeeId', 'name', 'phone', 'initial', 'createdAt'],
  },
  Productos: {
    headers: ['id', 'name', 'emoji', 'price', 'active'],
    textCols: ['id', 'name', 'emoji'],
  },
  Compras: {
    // unitPrice va al final para no desalinear datos ya existentes al re-ejecutar setup.
    headers: ['id', 'personId', 'productId', 'quantity', 'method', 'date', 'paidMethod', 'paidDate', 'unitPrice'],
    textCols: ['id', 'personId', 'productId', 'method', 'date', 'paidMethod', 'paidDate'],
  },
  Seguridad: {
    headers: ['clave', 'valor'],
    textCols: ['clave', 'valor'],
  },
}

function setupSpreadsheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet()

  Object.keys(SHEET_DEFS).forEach(name => {
    const def = SHEET_DEFS[name]
    let sh = ss.getSheetByName(name)
    if (!sh) sh = ss.insertSheet(name)

    // Cabeceras (fila 1) en negrita y congelada.
    sh.getRange(1, 1, 1, def.headers.length).setValues([def.headers]).setFontWeight('bold')
    sh.setFrozenRows(1)

    // Formato de texto para las columnas indicadas.
    def.textCols.forEach(col => {
      const c = def.headers.indexOf(col) + 1
      if (c > 0) sh.getRange(1, c, sh.getMaxRows(), 1).setNumberFormat('@')
    })
  })

  // Elimina la hoja por defecto "Sheet1"/"Hoja 1" si quedó vacía.
  const def1 = ss.getSheetByName('Sheet1') || ss.getSheetByName('Hoja 1') || ss.getSheetByName('Hoja1')
  if (def1 && def1.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(def1)

  seedSeguridad()

  SpreadsheetApp.getActiveSpreadsheet().toast('Setup completo ✔', 'Snacks Marianita', 5)
}

/** Crea el PIN por defecto (1234) solo si no existe aún. */
function seedSeguridad() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Seguridad')
  const yaTienePin = sh.getLastRow() > 1 &&
    sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().some(r => String(r[0]) === 'pin')
  if (yaTienePin) return
  sh.appendRow(['pin', '1234'])
}


// ─── Helpers opcionales de mantenimiento (ejecutar a mano si hace falta) ──────

/** Borra todas las filas de datos de Compras (deja las cabeceras). */
function resetCompras() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Compras')
  if (sh.getLastRow() > 1) sh.deleteRows(2, sh.getLastRow() - 1)
}
