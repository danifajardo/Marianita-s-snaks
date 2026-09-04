/**
 * Errores — catálogo central de códigos.
 *
 * El backend nunca decide en qué idioma habla el usuario: lanza un CÓDIGO
 * (`ERR-0xx`) y el frontend lo traduce con sus propios textos en es/en/ko
 * (ver `frontend/src/i18n/*.js`, bloque `errors`).
 *
 * El sobre de error queda así:
 *   { ok: false, code: 'ERR-054', error: '<texto en español>', params: { ... } }
 *
 * - `code`   → lo que el frontend usa para traducir. Es el contrato.
 * - `error`  → texto en español, solo como respaldo y para leer los registros
 *              de Apps Script. El frontend lo muestra si no conoce el código.
 * - `params` → valores a interpolar en el texto traducido (p. ej. el producto).
 *
 * Al añadir un código nuevo hay que añadirlo TAMBIÉN a los tres idiomas del
 * frontend; `node backend/test/errores.test.js` falla si alguno se queda atrás.
 */

const ERRORES = {
  // ─── Sesión y permisos ────────────────────────────────────────────────────
  'ERR-001': 'No autenticado',
  'ERR-002': 'Sesión inválida',
  'ERR-003': 'Sesión expirada',
  'ERR-004': 'Necesitas el PIN de Marianita',
  'ERR-005': 'Acción desconocida',

  // ─── Estado de la cuenta ──────────────────────────────────────────────────
  'ERR-010': 'Persona no encontrada',
  'ERR-011': 'Tu cuenta ya no está activa',
  'ERR-012': 'Tu cuenta todavía está pendiente de aprobación',
  'ERR-013': 'Ese número de empleado ya está registrado',
  'ERR-014': 'Estado inválido',

  // ─── PIN ──────────────────────────────────────────────────────────────────
  'ERR-020': 'El PIN debe ser de 4 dígitos',
  'ERR-021': 'Número de empleado o PIN incorrecto',
  'ERR-022': 'Esta persona todavía no tiene PIN. Créalo desde la app.',
  'ERR-023': 'Esta persona ya tiene PIN',
  'ERR-024': 'Demasiados intentos fallidos. Espera unos minutos e inténtalo de nuevo.',
  'ERR-025': 'PIN incorrecto',
  'ERR-026': 'PIN actual incorrecto',
  'ERR-027': 'No hay PIN de administración configurado. Ejecuta setupSpreadsheet().',

  // ─── Datos de la persona ──────────────────────────────────────────────────
  'ERR-030': 'Falta el número de empleado',
  'ERR-031': 'El número de empleado debe ser numérico',
  'ERR-032': 'Falta el nombre',
  'ERR-033': 'El nombre es demasiado largo',
  'ERR-034': 'El teléfono no es válido',
  'ERR-035': 'Falta el id de la persona',

  // ─── Productos ────────────────────────────────────────────────────────────
  'ERR-040': 'Falta el nombre del producto',
  'ERR-041': 'Precio inválido',
  'ERR-042': 'Falta el id del producto',
  'ERR-043': 'Nada que actualizar',
  'ERR-044': 'Producto no encontrado',

  // ─── Compras ──────────────────────────────────────────────────────────────
  'ERR-050': 'Falta la persona',
  'ERR-051': 'Método de pago inválido',
  'ERR-052': 'No hay productos en la compra',
  'ERR-053': 'Demasiados productos en una sola compra',
  'ERR-054': 'Cantidad inválida',
  'ERR-055': 'Cantidad demasiado alta',
  'ERR-056': 'No hay compras para saldar',
  'ERR-057': 'Esa compra no existe',
  'ERR-058': 'Esa compra no es fiada',
  'ERR-059': 'Esa compra ya está saldada',
  'ERR-060': 'Esa compra no es tuya',

  // ─── Reportes ─────────────────────────────────────────────────────────────
  'ERR-070': 'La fecha de inicio no es válida',
  'ERR-071': 'La fecha de fin no es válida',

  // ─── Configuración de la hoja (fallos de instalación, no del usuario) ─────
  'ERR-090': 'Falta una hoja del documento. Ejecuta setupSpreadsheet() una vez.',
  'ERR-091': 'La hoja no tiene columna "id".',
  'ERR-092': 'No existe ese id en la hoja.',
}

/**
 * Lanza un error del catálogo.
 * @param {string} code   código `ERR-0xx`
 * @param {Object} params valores para interpolar en el texto traducido
 */
function fail(code, params) {
  const err = new Error(ERRORES[code] || code)
  err.code = code
  if (params) err.params = params
  throw err
}

/** Convierte cualquier excepción en el sobre de error que viaja al cliente. */
function errorPayload(err) {
  const code = (err && err.code) || 'ERR-000'
  const body = {
    ok: false,
    code: code,
    error: (err && err.message) ? err.message : String(err),
  }
  if (err && err.params) body.params = err.params
  return body
}
