import { useState, useMemo, useEffect } from 'react'
import { createIcons, icons } from 'lucide'
import { useTranslation } from 'react-i18next'
import { formatCOP } from '../data'

export default function RegisterPurchase({ products, person, onConfirm }) {
  const { t } = useTranslation()
  const [cart, setCart]               = useState({})
  const [method, setMethod]           = useState('cash')
  const [isConfirmed, setIsConfirmed] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [saving, setSaving]           = useState(false)
  const [saveError, setSaveError]     = useState('')

  useEffect(() => { createIcons({ icons }) }, [cart, method, isConfirmed, isModalOpen, searchQuery])

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
      setSaveError(err?.message || t('register.saveError'))
    } finally {
      setSaving(false)
    }
  }

  if (isConfirmed) {
    return (
      <div className="confirm-screen">
        <div className="confirm-pop">
          <div className="confirm-circle"><i data-lucide="check"></i></div>
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
        <i data-lucide="search" className="search-bar-icon"></i>
        <input
          className="search-bar-input"
          type="text"
          placeholder={t('register.searchPlaceholder')}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button className="search-bar-clear icon-btn" onClick={() => setSearchQuery('')}>
            <i data-lucide="x"></i>
          </button>
        )}
      </div>

      {filteredProducts.length === 0 ? (
        <div className="empty">
          <div className="empty-emoji">🔍</div>
          <h2>{t('register.noResults')}</h2>
          <p>{t('register.noResultsDesc', { query: searchQuery })}</p>
        </div>
      ) : (
        <div className="product-grid">
          {filteredProducts.map(p => {
            const qty = cart[p.id] || 0
            return (
              <button
                key={p.id}
                className={'product-card ' + (qty > 0 ? 'selected' : '')}
                onClick={() => toggle(p.id)}
              >
                {qty > 0 && (
                  <span className="qty-bubble">
                    {qty}
                    <span className="qty-minus" onClick={(e) => decrease(p.id, e)}>−</span>
                  </span>
                )}
                <span className="product-emoji">{p.emoji}</span>
                <span className="product-name">{p.name}</span>
                <span className="product-price">{formatCOP(p.price)}</span>
              </button>
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
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <h2>{t('register.confirmTitle')}</h2>
              <button className="icon-btn" onClick={() => setIsModalOpen(false)}>
                <i data-lucide="x"></i>
              </button>
            </div>

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
          </div>
        </div>
      )}
    </div>
  )
}
