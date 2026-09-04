/**
 * Traducción de los errores del backend.
 *
 * El backend no sabe en qué idioma está el usuario: responde un código
 * (`ERR-0xx`, ver `backend/Errores.gs`) y aquí lo convertimos al texto del
 * idioma activo usando el bloque `errors` de `./i18n/*.js`.
 *
 * Si el código no está traducido (backend más nuevo que el frontend), cae al
 * mensaje en español que vino en la respuesta, para no dejar al usuario sin
 * ninguna explicación.
 */

/** Código de error de una excepción, o null si no viene del backend. */
export function errorCode(err) {
  return err && typeof err.code === 'string' ? err.code : null
}

/** ¿Es este error exactamente ese código? */
export function isError(err, code) {
  return errorCode(err) === code
}

/**
 * Texto ya traducido para mostrarle al usuario.
 * @param {Error}    err error lanzado por `api.js`
 * @param {Function} t   función `t` de react-i18next
 */
export function errorText(err, t) {
  const code = errorCode(err)
  const params = (err && err.params) || {}

  if (code) {
    const key = `errors.${code}`
    const texto = t(key, params)
    // i18next devuelve la propia clave cuando no existe la traducción.
    if (texto !== key) return texto
  }

  // Respaldo: el mensaje en español del backend, o un genérico.
  return (err && err.message) || t('errors.ERR-000')
}
