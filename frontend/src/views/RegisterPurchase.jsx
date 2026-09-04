import { useState, useMemo } from 'react'
import { Icon } from '../icons'
import { useTranslation } from 'react-i18next'
import { formatCOP, LOW_STOCK } from '../data'
import { errorText } from '../errors'
import { Modal } from '../Components'

export default function RegisterPurchase({ products, person, onConfirm }) {
  const { t } = useTranslation()
  const [cart, setCart]               = useState({})
  const [method, setMethod]           = useState('cash')
  const [isConfirmed, setIsConfirmed] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [saving, setSaving]           = useState(false)
  const [saveError, setSaveError]     = useState('')


  const activeProducts = products.filter(p => p.active)

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return activeProducts
    return activeProducts.filter(p => p.name.toLowerCase().includes(q))
  }, [activeProducts, searchQuery])

  const totalQuantity = Object.values(cart).reduce((a, b) => a + b, 0)
  const total = useMemo(() =>
    Object.entries(cart).reduce((acc, [productId, qty]) => {
      const p = products.find(x => x.id === productId)
      return acc + (p ? p.price * qty : 0)
    }, 0)
  , [cart, products])

  const cartItems = useMemo(() =>
    Object.entries(cart).map(([productId, qty]) => {
      const p = products.find(x => x.id === productId)
      return p ? { ...p, quantity: qty, subtotal: p.price * qty } : null
    }).filter(Boolean)
  , [cart, products])

  const toggle = (productId) =>
    setCart(prev => ({ ...prev, [productId]: (prev[productId] || 0) + 1 }))

  const decrease = (productId, e) => {
    e.stopPropagation()
    setCart(prev => {
      const next = { ...prev }
      next[productId] = (next[productId] || 0) - 1
      if (next[productId] <= 0) delete next[productId]
      return next
    })
  }

  const confirm = async () => {
    if (saving) return
    const items = Object.entries(cart).map(([productId, quantity]) => ({ productId, quantity }))
    try {
      setSaving(true)
      setSaveError('')
      await onConfirm({ personId: person.id, method, items, total })
      setIsModalOpen(false)
      setIsConfirmed(true)
      setTimeout(() => { setCart({}); setIsConfirmed(false) }, 2400)
    } catch (err) {
      setSaveError(errorText(err, t))
    } finally {
      setSaving(false)
    }
  }

  if (isConfirmed) {
    return (
      <div className="confirm-screen">
        <div className="confirm-pop">
          <div className="confirm-circle"><Icon name="check" /></div>
          <h1>{t('register.done')}</h1>
          <p className="confirm-msg">{t('register.recorded', { name: person.name.split(' ')[0] })}</p>
          <p className="confirm-amt">
            {formatCOP(total)} · {t('register.' + method).toLowerCase()}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="view">
      <h1 className="view-title">{t('register.title', { name: person.name.split(' ')[0] })}</h1>
      <p className="view-sub">{t('register.subtitle')}</p>

      <div className="search-bar">
        <Icon name="search" className="search-bar-icon" />
        <input
          className="search-bar-input"
          type="text"
          placeholder={t('register.searchPlaceholder')}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button className="search-bar-clear icon-btn" onClick={() => setSearchQuery('')}>
            <Icon name="x" />
          </button>
        )}
      </div>

      {filteredProducts.length === 0 ? (
        <div className="empty">
          <div className="empty-emoji"><Icon name="search-x" /></div>
          <h2>{t('register.noResults')}</h2>
          <p>{t('register.noResultsDesc', { query: searchQuery })}</p>
        </div>
      ) : (
        <div className="product-grid">
          {filteredProducts.map(p => {
            const qty = cart[p.id] || 0
            return (
              <div key={p.id} className="product-cell">
                <button
                  className={'product-card ' + (qty > 0 ? 'selected' : '')}
                  onClick={() => toggle(p.id)}
                  aria-label={t('register.addOne', { name: p.name })}
                >
                  {typeof p.stock === 'number' && p.stock <= 0 && (
                    <span className="stock-badge out">{t('register.outOfStock')}</span>
                  )}
                  {typeof p.stock === 'number' && p.stock > 0 && p.stock <= LOW_STOCK && (
                    <span className="stock-badge low">{t('register.lowStock', { count: p.stock })}</span>
                  )}
                  <span className="product-emoji" aria-hidden="true">{p.emoji}</span>
                  <span className="product-name">{p.name}</span>
                  <span className="product-price">{formatCOP(p.price)}</span>
                </button>
                {qty > 0 && (
                  <span className="qty-bubble">
                    <span className="qty-count" aria-hidden="true">{qty}</span>
                    <button
                      type="button"
                      className="qty-minus"
                      onClick={(e) => decrease(p.id, e)}
                      aria-label={t('register.removeOne', { name: p.name })}
                    >
                      −
                    </button>
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {totalQuantity > 0 && (
        <div className="checkout-bar">
          <div className="checkout-method">
            <span className="caption">{t('register.howPaid')}</span>
            <div className="seg">
              <button className={method === 'cash' ? 'on' : ''} onClick={() => setMethod('cash')}>
                <span className="dot menta"></span>{t('register.cash')}
              </button>
              <button className={method === 'transfer' ? 'on' : ''} onClick={() => setMethod('transfer')}>
                <span className="dot lavanda"></span>{t('register.transfer')}
              </button>
              <button className={method === 'debt' ? 'on' : ''} onClick={() => setMethod('debt')}>
                <span className="dot durazno"></span>{t('register.debt')}
              </button>
            </div>
          </div>
          <button className="btn-primary big" onClick={() => setIsModalOpen(true)}>
            <span>{t('register.recordBtn')}</span>
            <span className="checkout-total">{formatCOP(total)}</span>
          </button>
        </div>
      )}

      {isModalOpen && (
        <Modal title={t('register.confirmTitle')} onClose={() => setIsModalOpen(false)}>
            <div className="confirm-modal">
              <ul className="confirm-modal-list">
                {cartItems.map(item => (
                  <li key={item.id} className="confirm-modal-row">
                    <span className="confirm-modal-emoji">{item.emoji}</span>
                    <span className="confirm-modal-name">{item.name}</span>
                    <span className="confirm-modal-qty">× {item.quantity}</span>
                    <span className="confirm-modal-subtotal mono">{formatCOP(item.subtotal)}</span>
                  </li>
                ))}
              </ul>

              <div className="confirm-modal-footer">
                <span className={'badge method-' + method}>
                  {t('register.' + method)}
                </span>
                <div className="confirm-modal-total">
                  <span className="caption">{t('register.total')}</span>
                  <span className="confirm-modal-total-amt">{formatCOP(total)}</span>
                </div>
              </div>
            </div>

            {saveError && <p className="pin-msg" style={{ padding: '0 20px' }}>{saveError}</p>}
            <div className="confirm-modal-actions">
              <button className="btn-primary" style={{ flex: 1 }} onClick={confirm} disabled={saving}>
                {saving ? t('register.saving') : t('register.confirmBtn')}
              </button>
              <button className="btn-ghost" onClick={() => setIsModalOpen(false)} disabled={saving}>
                {t('register.review')}
              </button>
            </div>
        </Modal>
      )}
    </div>
  )
}
