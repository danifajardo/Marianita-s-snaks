import { useState, useMemo, useEffect } from 'react'
import { createIcons, icons } from 'lucide'
import { useTranslation } from 'react-i18next'
import { formatCOP } from '../data'

export default function MarianitaPanel({ purchases, products, persons, onToggleProduct, onEditPrice, onAddProduct }) {
  const { t } = useTranslation()
  const [range, setRange]         = useState('week')
  const [tab, setTab]             = useState('summary')
  const [editingId, setEditingId] = useState(null)
  const [tempPrice, setTempPrice] = useState('')
  const [isAdding, setIsAdding]   = useState(false)
  const [newName, setNewName]     = useState('')
  const [newPrice, setNewPrice]   = useState('')

  useEffect(() => { createIcons({ icons }) }, [range, tab, editingId, isAdding, products])

  const inRange = (iso) => {
    const days = (new Date() - new Date(iso)) / (1000 * 60 * 60 * 24)
    if (range === 'today') return days < 1
    if (range === 'week')  return days < 7
    if (range === 'month') return days < 30
    return true
  }

  const filtered       = purchases.filter(c => inRange(c.date))
  const purchaseTotal  = (c) => { const p = products.find(x => x.id === c.productId); return p ? p.price * c.quantity : 0 }
  const grandTotal     = filtered.reduce((a, c) => a + purchaseTotal(c), 0)
  const cashTotal      = filtered.filter(c => c.method === 'cash').reduce((a, c) => a + purchaseTotal(c), 0)
  const transferTotal  = filtered.filter(c => c.method === 'transfer').reduce((a, c) => a + purchaseTotal(c), 0)

  const debts = useMemo(() => {
    const amountMap = {}
    filtered.forEach(c => { amountMap[c.personId] = (amountMap[c.personId] || 0) + purchaseTotal(c) })
    return persons
      .map(p => ({ person: p, total: amountMap[p.id] || 0 }))
      .filter(x => x.total > 0)
      .sort((a, b) => b.total - a.total)
  }, [filtered, persons, products])

  const startEdit = (p) => { setEditingId(p.id); setTempPrice(String(p.price)) }
  const saveEdit  = () => {
    const parsedPrice = parseInt(tempPrice.replace(/\D/g, ''), 10)
    if (!isNaN(parsedPrice) && parsedPrice > 0) onEditPrice(editingId, parsedPrice)
    setEditingId(null)
  }
  const handleAdd = () => {
    const parsedPrice = parseInt(newPrice.replace(/\D/g, ''), 10)
    if (newName.trim() && !isNaN(parsedPrice) && parsedPrice > 0) {
      onAddProduct({ name: newName.trim(), price: parsedPrice })
      setNewName(''); setNewPrice(''); setIsAdding(false)
    }
  }

  const captions = {
    today: t('panel.totalToday'),
    week:  t('panel.totalWeek'),
    month: t('panel.totalMonth'),
    all:   t('panel.totalAll'),
  }

  return (
    <div className="view wide">
      <div className="view-head-row">
        <h1 className="view-title">{t('panel.title')}</h1>
        <div className="seg seg-filter sm">
          {[['today', t('panel.today')], ['week', t('panel.thisWeek')], ['month', t('panel.thisMonth')], ['all', t('panel.all')]].map(([id, label]) => (
            <button key={id} className={range === id ? 'on' : ''} onClick={() => setRange(id)}>{label}</button>
          ))}
        </div>
      </div>

      <div className="totales-grid">
        <div className="total-card grande">
          <span className="caption">{captions[range]}</span>
          <div className="total-amt fresa">{formatCOP(grandTotal)}</div>
        </div>
        <div className="total-card">
          <span className="caption"><span className="dot menta"></span> {t('panel.cash')}</span>
          <div className="total-amt">{formatCOP(cashTotal)}</div>
        </div>
        <div className="total-card">
          <span className="caption"><span className="dot lavanda"></span> {t('panel.transfer')}</span>
          <div className="total-amt">{formatCOP(transferTotal)}</div>
        </div>
      </div>

      <div className="tabs">
        <button className={tab === 'summary' ? 'on' : ''} onClick={() => setTab('summary')}>
          <i data-lucide="users"></i>{t('panel.whoOwes')}
        </button>
        <button className={tab === 'products' ? 'on' : ''} onClick={() => setTab('products')}>
          <i data-lucide="package"></i>{t('panel.products')}
        </button>
      </div>

      {tab === 'summary' && (
        <div className="card">
          {debts.length === 0 ? (
            <div className="empty small">
              <div className="empty-emoji">🌤️</div>
              <h2>{t('panel.upToDate')}</h2>
              <p>{t('panel.noDebts')}</p>
            </div>
          ) : (
            <table className="deudas-table">
              <thead>
                <tr>
                  <th>{t('panel.person')}</th>
                  <th>{t('panel.purchases')}</th>
                  <th style={{ textAlign: 'right' }}>{t('panel.owes')}</th>
                </tr>
              </thead>
              <tbody>
                {debts.map(({ person, total }, i) => {
                  const count = filtered.filter(c => c.personId === person.id).length
                  return (
                    <tr key={person.id}>
                      <td>
                        <div className="persona-cell">
                          <span className="avatar">{person.initial}</span>
                          <div>
                            <div className="persona-name">{person.name}</div>
                            <div className="persona-area">{t('panel.count', { count })} · {person.phone}</div>
                          </div>
                          {i === 0 && <span className="rank-badge">#1</span>}
                        </div>
                      </td>
                      <td className="body-sm deudas-count">{t('panel.count', { count })}</td>
                      <td className="mono amt">{formatCOP(total)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'products' && (
        <div className="card">
          <div className="productos-list">
            {products.map(p => (
              <div key={p.id} className={'prod-row ' + (p.active ? '' : 'off')}>
                <span className="prod-emoji">{p.emoji}</span>
                <div className="prod-meta">
                  <div className="prod-name">{p.name}</div>
                  {editingId === p.id ? (
                    <div className="prod-edit">
                      <input className="precio-input" value={tempPrice} onChange={e => setTempPrice(e.target.value)} autoFocus />
                      <button className="btn-primary sm" onClick={saveEdit}>{t('panel.save')}</button>
                      <button className="btn-ghost sm" onClick={() => setEditingId(null)}>{t('panel.cancel')}</button>
                    </div>
                  ) : (
                    <button className="prod-price" onClick={() => startEdit(p)}>
                      {formatCOP(p.price)} <i data-lucide="pencil"></i>
                    </button>
                  )}
                </div>
                <label className="toggle">
                  <input type="checkbox" checked={p.active} onChange={() => onToggleProduct(p.id)} />
                  <span className="toggle-track"><span className="toggle-thumb"></span></span>
                  <span className="toggle-label">{p.active ? t('panel.available') : t('panel.soldOut')}</span>
                </label>
              </div>
            ))}
          </div>
          {isAdding ? (
            <div className="prod-add">
              <input placeholder={t('panel.productName')} value={newName}  onChange={e => setNewName(e.target.value)} />
              <input placeholder={t('panel.price')}       value={newPrice} onChange={e => setNewPrice(e.target.value)} />
              <button className="btn-primary" onClick={handleAdd}>{t('panel.add')}</button>
              <button className="btn-ghost" onClick={() => setIsAdding(false)}>{t('panel.cancel')}</button>
            </div>
          ) : (
            <button className="btn-add-prod" onClick={() => setIsAdding(true)}>
              <i data-lucide="plus"></i> {t('panel.addProduct')}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
