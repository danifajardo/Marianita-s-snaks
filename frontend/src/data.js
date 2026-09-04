// Utilidades compartidas de dominio y formato.
//
// El catálogo de productos y las personas viven en Google Sheets y llegan por la
// API; los antiguos `initialProducts` / `initialPersons` / `initialPurchases` que
// sembraban datos en memoria ya no se usan y se eliminaron.

export const formatCOP = (n) =>
  '$ ' + n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')

// Umbral para avisar "stock bajo" en el catálogo.
export const LOW_STOCK = 5

// Método "efectivo" de una compra: una compra fiada (debt) ya pagada cuenta según
// el método con que se saldó (paidMethod); si sigue pendiente, cuenta como 'debt'.
export const effectiveMethod = (c) =>
  c.method === 'debt' && c.paidMethod ? c.paidMethod : c.method

// Total de una línea de compra. Usa el precio congelado al momento de la compra
// (unitPrice); si no existe (compras viejas), cae al precio actual del producto.
export const lineTotal = (c, products) => {
  const unit = Number(c.unitPrice) || 0
  if (unit > 0) return unit * c.quantity
  const p = products.find(x => x.id === c.productId)
  return p ? p.price * c.quantity : 0
}

const LOCALE_MAP = { en: 'en-US', es: 'es-CO', ko: 'ko-KR' }

export const relativeDate = (iso, t, lang = 'es') => {
  const days = Math.floor((new Date() - new Date(iso)) / (1000 * 60 * 60 * 24))
  if (days === 0) return t ? t('dates.today')                     : 'Hoy'
  if (days === 1) return t ? t('dates.yesterday')                 : 'Ayer'
  if (days < 7)  return t ? t('dates.daysAgo', { count: days }) : `Hace ${days} días`
  return new Date(iso).toLocaleDateString(LOCALE_MAP[lang] ?? 'es-CO', { day: '2-digit', month: 'short' })
}
