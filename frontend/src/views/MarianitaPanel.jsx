import { useState, Fragment } from 'react'
import { Icon } from '../icons'
import { useTranslation } from 'react-i18next'
import { formatCOP, effectiveMethod, lineTotal, relativeDate, LOW_STOCK } from '../data'
import { MetodoBadge } from '../Components'

export default function MarianitaPanel({ purchases, products, persons, pendingPersons = [], inactivePersons = [], onToggleProduct, onEditPrice, onEditStock, onAddProduct, onApprovePerson, onRejectPerson, onResetPin, onDeactivatePerson, onReactivatePerson }) {
  const { t, i18n } = useTranslation()
  const [range, setRange]         = useState('week')
  const [tab, setTab]             = useState('summary')
  const [editingId, setEditingId] = useState(null)
  const [tempPrice, setTempPrice] = useState('')
  const [stockEditId, setStockEditId] = useState(null)
  const [tempStock, setTempStock] = useState('')
  const [isAdding, setIsAdding]   = useState(false)
  const [newName, setNewName]     = useState('')
  const [newPrice, setNewPrice]   = useState('')
  const [newStock, setNewStock]   = useState('')
  const [expandedDay, setExpandedDay] = useState(null)


  const inRange = (iso) => {
    const days = (new Date() - new Date(iso)) / (1000 * 60 * 60 * 24)
    if (range === 'today') return days < 1
    if (range === 'week')  return days < 7
    if (range === 'month') return days < 30
    return true
  }

  const filtered       = purchases.filter(c => inRange(c.date))
  const purchaseTotal  = (c) => lineTotal(c, products)
  // Totales por método efectivo: una deuda saldada en efectivo suma a "efectivo", etc.
  const totalByMethod  = (m) => filtered.filter(c => effectiveMethod(c) === m).reduce((a, c) => a + purchaseTotal(c), 0)
  const grandTotal     = filtered.reduce((a, c) => a + purchaseTotal(c), 0)
  const cashTotal      = totalByMethod('cash')
  const transferTotal  = totalByMethod('transfer')
  const debtTotal      = totalByMethod('debt')

  // "Quién debe" solo cuenta lo fiado pendiente (effectiveMethod === 'debt');
  // lo pagado (efectivo, transferencia o deuda ya saldada) no aparece.
  // Sin useMemo: `filtered` se recrea en cada render, así que la caché nunca acertaba.
  const debts = (() => {
    const amountMap = {}
    filtered.filter(c => effectiveMethod(c) === 'debt').forEach(c => {
      amountMap[c.personId] = (amountMap[c.personId] || 0) + purchaseTotal(c)
    })
    return persons
      .map(p => ({ person: p, total: amountMap[p.id] || 0 }))
      .filter(x => x.total > 0)
      .sort((a, b) => b.total - a.total)
  })()

  // Ventas agrupadas por día (calendario local), más reciente primero.
  const salesByDay = (() => {
    const map = {}
    filtered.forEach(c => {
      const d = new Date(c.date)
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      if (!map[key]) map[key] = { key, date: c.date, total: 0, count: 0, items: [] }
      map[key].total += purchaseTotal(c)
      map[key].count += 1
      map[key].items.push(c)
    })
    return Object.values(map).sort((a, b) => new Date(b.date) - new Date(a.date))
  })()

  const activeUsers = persons.filter(p => p.status === 'active')

  // Feedback de las acciones sobre usuarios (aprobar/rechazar/resetear PIN).
  const [busy, setBusy] = useState(null)   // { id, action }
  const runOn = async (id, action, fn) => {
    if (busy) return
    setBusy({ id, action })
    try { await fn(id) } catch (err) { console.error(err) } finally { setBusy(null) }
  }
  const isBusy  = (id, action) => busy && busy.id === id && busy.action === action
  const rowBusy = (id) => !!(busy && busy.id === id)

  const startEdit = (p) => { setEditingId(p.id); setTempPrice(String(p.price)) }
  const saveEdit  = () => {
    const parsedPrice = parseInt(tempPrice.replace(/\D/g, ''), 10)
    if (!isNaN(parsedPrice) && parsedPrice > 0) onEditPrice(editingId, parsedPrice)
    setEditingId(null)
  }
  const startEditStock = (p) => { setStockEditId(p.id); setTempStock(String(p.stock ?? 0)) }
  const saveStock = () => {
    const parsedStock = parseInt(tempStock.replace(/[^\d]/g, ''), 10)
    if (!isNaN(parsedStock)) onEditStock(stockEditId, parsedStock)
    setStockEditId(null)
  }
  const handleAdd = () => {
    const parsedPrice = parseInt(newPrice.replace(/\D/g, ''), 10)
    const parsedStock = parseInt(newStock.replace(/[^\d]/g, ''), 10)
    if (newName.trim() && !isNaN(parsedPrice) && parsedPrice > 0) {
      onAddProduct({ name: newName.trim(), price: parsedPrice, stock: isNaN(parsedStock) ? 0 : parsedStock })
      setNewName(''); setNewPrice(''); setNewStock(''); setIsAdding(false)
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
        <div className="total-card">
          <span className="caption"><span className="dot durazno"></span> {t('panel.debt')}</span>
          <div className="total-amt">{formatCOP(debtTotal)}</div>
        </div>
      </div>

      <div className="tabs">
        <button className={tab === 'summary' ? 'on' : ''} onClick={() => setTab('summary')}>
          <Icon name="users" />{t('panel.whoOwes')}
        </button>
        <button className={tab === 'sales' ? 'on' : ''} onClick={() => setTab('sales')}>
          <Icon name="receipt" />{t('panel.sales')}
        </button>
        <button className={tab === 'products' ? 'on' : ''} onClick={() => setTab('products')}>
          <Icon name="package" />{t('panel.products')}
        </button>
        <button className={tab === 'requests' ? 'on' : ''} onClick={() => setTab('requests')}>
          <Icon name="users-round" />{t('panel.users')}
          {pendingPersons.length > 0 && <span className="req-badge">{pendingPersons.length}</span>}
        </button>
      </div>

      {tab === 'requests' && (
        <div className="card">
          {pendingPersons.length > 0 && (
            <>
              <div className="section-label">{t('panel.pendingSection')}</div>
              <div className="productos-list">
                {pendingPersons.map(p => (
                  <div key={p.id} className="prod-row">
                    <span className="avatar">{p.initial}</span>
                    <div className="prod-meta">
                      <div className="prod-name">{p.name}</div>
                      <div className="persona-area">#{p.employeeId} · {p.phone}</div>
                    </div>
                    <div className="settle-actions">
                      <button className="btn-primary sm" disabled={rowBusy(p.id)} onClick={() => runOn(p.id, 'approve', onApprovePerson)}>
                        {isBusy(p.id, 'approve') ? t('panel.processing') : t('panel.approve')}
                      </button>
                      <button className="btn-ghost sm" disabled={rowBusy(p.id)} onClick={() => runOn(p.id, 'reject', onRejectPerson)}>
                        {isBusy(p.id, 'reject') ? t('panel.processing') : t('panel.reject')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="section-label">{t('panel.activeSection')}</div>
          {activeUsers.length === 0 ? (
            <div className="empty small">
              <div className="empty-emoji"><Icon name="users" /></div>
              <h2>{t('panel.noUsers')}</h2>
            </div>
          ) : (
            <div className="productos-list">
              {activeUsers.map(p => (
                <div key={p.id} className="prod-row">
                  <span className="avatar">{p.initial}</span>
                  <div className="prod-meta">
                    <div className="prod-name">{p.name}</div>
                    <div className="persona-area">#{p.employeeId}{p.hasPin === false ? ' · ' + t('panel.noPin') : ''}</div>
                  </div>
                  <div className="settle-actions">
                    <button className="btn-ghost sm" disabled={rowBusy(p.id)} onClick={() => runOn(p.id, 'reset', onResetPin)}>
                      {isBusy(p.id, 'reset') ? t('panel.processing') : t('panel.resetPin')}
                    </button>
                    <button className="btn-ghost sm" disabled={rowBusy(p.id)} onClick={() => runOn(p.id, 'deactivate', onDeactivatePerson)}>
                      {isBusy(p.id, 'deactivate') ? t('panel.processing') : t('panel.deactivate')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {inactivePersons.length > 0 && (
            <>
              <div className="section-label">{t('panel.inactiveSection')}</div>
              <div className="productos-list">
                {inactivePersons.map(p => (
                  <div key={p.id} className="prod-row off">
                    <span className="avatar">{p.initial}</span>
                    <div className="prod-meta">
                      <div className="prod-name">{p.name}</div>
                      <div className="persona-area">#{p.employeeId}</div>
                    </div>
                    <button className="btn-primary sm" disabled={rowBusy(p.id)} onClick={() => runOn(p.id, 'reactivate', onReactivatePerson)}>
                      {isBusy(p.id, 'reactivate') ? t('panel.processing') : t('panel.reactivate')}
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'sales' && (
        <div className="card">
          {salesByDay.length === 0 ? (
            <div className="empty small">
              <div className="empty-emoji"><Icon name="receipt" /></div>
              <h2>{t('panel.noSales')}</h2>
            </div>
          ) : (
            <table className="deudas-table">
              <thead>
                <tr>
                  <th>{t('panel.day')}</th>
                  <th>{t('panel.purchases')}</th>
                  <th style={{ textAlign: 'right' }}>{t('panel.salesTotal')}</th>
                </tr>
              </thead>
              <tbody>
                {salesByDay.map(d => (
                  <Fragment key={d.key}>
                    <tr className="sales-day-row" onClick={() => setExpandedDay(expandedDay === d.key ? null : d.key)}>
                      <td className="persona-name">
                        <svg
                          className={'sales-chevron' + (expandedDay === d.key ? ' open' : '')}
                          viewBox="0 0 24 24" width="14" height="14"
                          fill="none" stroke="currentColor" strokeWidth="2"
                          strokeLinecap="round" strokeLinejoin="round"
                        >
                          <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                        {relativeDate(d.date, t, i18n.language)}
                      </td>
                      <td className="body-sm deudas-count">{t('panel.count', { count: d.count })}</td>
                      <td className="mono amt">{formatCOP(d.total)}</td>
                    </tr>
                    {expandedDay === d.key && (
                      <tr className="day-detail-row">
                        <td colSpan={3}>
                          <div className="day-detail">
                            {d.items.map(c => {
                              const p = products.find(x => x.id === c.productId)
                              const persona = persons.find(x => x.id === c.personId)
                              return (
                                <div key={c.id} className="settle-row">
                                  <span className="prod-emoji">{p ? p.emoji : '🍬'}</span>
                                  <div className="settle-meta">
                                    <div className="compra-name">
                                      {p ? p.name : '—'}
                                      {c.quantity > 1 && <span className="qty"> × {c.quantity}</span>}
                                    </div>
                                    <div className="body-sm">{persona ? persona.name : '—'}</div>
                                  </div>
                                  <MetodoBadge method={effectiveMethod(c)} />
                                  <span className="mono">{formatCOP(purchaseTotal(c))}</span>
                                </div>
                              )
                            })}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'summary' && (
        <div className="card">
          {debts.length === 0 ? (
            <div className="empty small">
              <div className="empty-emoji"><Icon name="check-check" /></div>
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
                  const count = filtered.filter(c => c.personId === person.id && effectiveMethod(c) === 'debt').length
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
                  ) : stockEditId === p.id ? (
                    <div className="prod-edit">
                      <input className="precio-input" inputMode="numeric" value={tempStock} onChange={e => setTempStock(e.target.value)} autoFocus />
                      <button className="btn-primary sm" onClick={saveStock}>{t('panel.save')}</button>
                      <button className="btn-ghost sm" onClick={() => setStockEditId(null)}>{t('panel.cancel')}</button>
                    </div>
                  ) : (
                    <div className="prod-controls">
                      <button className="prod-price" onClick={() => startEdit(p)}>
                        {formatCOP(p.price)} <Icon name="pencil" />
                      </button>
                      <button
                        className={'prod-stock' + (p.stock <= 0 ? ' out' : p.stock <= LOW_STOCK ? ' low' : '')}
                        onClick={() => startEditStock(p)}
                      >
                        {t('panel.stockLabel', { count: p.stock ?? 0 })} <Icon name="pencil" />
                      </button>
                    </div>
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
              <input placeholder={t('panel.stock')} inputMode="numeric" value={newStock} onChange={e => setNewStock(e.target.value)} />
              <button className="btn-primary" onClick={handleAdd}>{t('panel.add')}</button>
              <button className="btn-ghost" onClick={() => setIsAdding(false)}>{t('panel.cancel')}</button>
            </div>
          ) : (
            <button className="btn-add-prod" onClick={() => setIsAdding(true)}>
              <Icon name="plus" /> {t('panel.addProduct')}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
