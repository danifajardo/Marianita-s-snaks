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
    // status/pinHash/pinSalt van al final para no desalinear datos existentes al re-ejecutar setup.
    headers: ['id', 'employeeId', 'name', 'phone', 'initial', 'createdAt', 'status', 'pinHash', 'pinSalt'],
    textCols: ['id', 'employeeId', 'name', 'phone', 'initial', 'createdAt', 'status', 'pinHash', 'pinSalt'],
  },
  Productos: {
    // stock va al final para no desalinear datos existentes al re-ejecutar setup.
    headers: ['id', 'name', 'emoji', 'price', 'active', 'stock'],
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

  const pinNuevo = seedSeguridad()

  const aviso = pinNuevo
    ? 'Setup completo ✔ — PIN de Mari: ' + pinNuevo + ' (anótalo ya, no se vuelve a mostrar)'
    : 'Setup completo ✔'
  SpreadsheetApp.getActiveSpreadsheet().toast(aviso, 'Snacks Marianita', 30)
}

/**
 * Siembra la seguridad inicial si aún no existe:
 *  - un PIN de administración ALEATORIO, guardado solo como hash
 *  - el secreto con el que se firman los tokens de sesión
 *
 * El PIN generado se muestra UNA vez (toast + registro de ejecución): hay que
 * anotarlo en ese momento, porque después ya no es recuperable. Para cambiarlo,
 * usa cambiarPinAdmin() más abajo.
 *
 * Antes se sembraba '1234' en texto plano en la hoja: cualquiera con acceso al
 * documento veía el PIN del panel.
 */
function seedSeguridad() {
  getSessionSecret()   // lo crea si falta

  const yaTienePin = !!getConfig('pinHash') || !!getConfig('pin')
  if (yaTienePin) return null

  const pin = String(Math.floor(Math.random() * 10000)).padStart(4, '0')
  const salt = makeSalt()
  setConfig('pinSalt', salt)
  setConfig('pinHash', hashPin(pin, salt))

  Logger.log('PIN de administración generado: ' + pin + ' — anótalo, no se puede recuperar.')
  return pin
}

/**
 * Cambia el PIN del panel a mano desde el editor de Apps Script.
 * Edítalo aquí, ejecuta la función y vuelve a dejarlo vacío.
 */
function cambiarPinAdmin() {
  const NUEVO_PIN = ''   // ← escribe aquí 4 dígitos y ejecuta
  if (!/^\d{4}$/.test(NUEVO_PIN)) fail('ERR-020')
  const salt = makeSalt()
  setConfig('pinSalt', salt)
  setConfig('pinHash', hashPin(NUEVO_PIN, salt))
  deleteConfig('pin')
  SpreadsheetApp.getActiveSpreadsheet().toast('PIN de administración actualizado ✔', 'Snacks Marianita', 5)
}


// ─── Helpers opcionales de mantenimiento (ejecutar a mano si hace falta) ──────

/** Borra todas las filas de datos de Compras (deja las cabeceras). */
function resetCompras() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Compras')
  if (sh.getLastRow() > 1) sh.deleteRows(2, sh.getLastRow() - 1)
}
