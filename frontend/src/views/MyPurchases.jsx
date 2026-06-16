import { useState, useMemo, useEffect } from 'react'
import { createIcons, icons } from 'lucide'
import { useTranslation } from 'react-i18next'
import { formatCOP, relativeDate, effectiveMethod, lineTotal } from '../data'
import { MetodoBadge } from '../Components'

export default function MyPurchases({ purchases, products, person, onSettle }) {
  const { t, i18n } = useTranslation()
  const [filter, setFilter]   = useState('all')
  const [isPayOpen, setIsPayOpen] = useState(false)
  const [paying, setPaying]   = useState(false)
  const [pending, setPending] = useState(null)   // { ids, method, amount } pendiente de confirmar
  const [payError, setPayError] = useState('')

  useEffect(() => { createIcons({ icons }) }, [filter, isPayOpen, pending, purchases])

  const priceOf     = (c) => lineTotal(c, products)
  const myPurchases = purchases.filter(c => c.personId === person.id)
  const filtered    = filter === 'all' ? myPurchases : myPurchases.filter(c => effectiveMethod(c) === filter)

  // El saldo "le debes a Marianita" es solo lo fiado pendiente; lo pagado (incluida una deuda ya saldada) no cuenta.
  const myDebt      = myPurchases.filter(c => effectiveMethod(c) === 'debt')
  const debtTotal   = myDebt.reduce((acc, c) => acc + priceOf(c), 0)

  const openPay  = () => { setPending(null); setPayError(''); setIsPayOpen(true) }
  const closePay = () => { if (paying) return; setPending(null); setPayError(''); setIsPayOpen(false) }
  const askPay   = (ids, method, amount) => { setPayError(''); setPending({ ids, method, amount }) }

  const confirmPay = async () => {
    if (paying || !pending) return
    try {
      setPaying(true)
      setPayError('')
      await onSettle(pending.ids, pending.method)
      setPending(null)
    } catch (err) {
      setPayError(err?.message || t('myPurchases.payError'))
    } finally {
      setPaying(false)
    }
  }

  const groups = useMemo(() => {
    const g = {}
    filtered.forEach(c => {
      const key = relativeDate(c.date, t, i18n.language)
      if (!g[key]) g[key] = []
      g[key].push(c)
    })
    return g
  }, [filtered, i18n.language])

  return (
    <div className="view">
      <h1 className="view-title">{t('myPurchases.title')}</h1>

      <div className="balance-card">
        <span className="caption">{t('myPurchases.owedTo')}</span>
        <div className="balance-amt">{formatCOP(debtTotal)}</div>
        <span className="balance-sub">
          {t('myPurchases.count', { count: myDebt.length })} · {t('myPurchases.pending')}
        </span>
        {debtTotal > 0 && (
          <button className="btn-primary" style={{ marginTop: '12px' }} onClick={openPay}>
            {t('myPurchases.pay')}
          </button>
        )}
      </div>

      <div className="seg seg-filter">
        <button className={filter === 'all' ? 'on' : ''} onClick={() => setFilter('all')}>
          {t('myPurchases.all')}
        </button>
        <button className={filter === 'cash' ? 'on' : ''} onClick={() => setFilter('cash')}>
          <span className="dot menta"></span>{t('myPurchases.cash')}
        </button>
        <button className={filter === 'transfer' ? 'on' : ''} onClick={() => setFilter('transfer')}>
          <span className="dot lavanda"></span>{t('myPurchases.transfer')}
        </button>
        <button className={filter === 'debt' ? 'on' : ''} onClick={() => setFilter('debt')}>
          <span className="dot durazno"></span>{t('myPurchases.debt')}
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="empty">
          <div className="empty-emoji">😴</div>
          <h2>{t('myPurchases.emptyTitle')}</h2>
          <p>{t('myPurchases.emptyDesc')}</p>
        </div>
      ) : (
        Object.entries(groups).map(([date, items]) => (
          <div key={date} className="day-group">
            <div className="day-label">{date}</div>
            <div className="compra-list">
              {items.map(c => {
                const p = products.find(x => x.id === c.productId)
                if (!p) return null
                return (
                  <div key={c.id} className="compra-row">
                    <span className="compra-emoji">{p.emoji}</span>
                    <div className="compra-meta">
                      <div className="compra-name">
                        {p.name}
                        {c.quantity > 1 && <span className="qty"> × {c.quantity}</span>}
                      </div>
                      <MetodoBadge method={effectiveMethod(c)} />
                    </div>
                    <span className="compra-amt mono">{formatCOP(priceOf(c))}</span>
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}

      {isPayOpen && myDebt.length > 0 && (
        <div className="modal-overlay" onClick={closePay}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <h2>{t('myPurchases.payTitle')}</h2>
              <button className="icon-btn" onClick={closePay}>
                <i data-lucide="x"></i>
              </button>
            </div>

            {pending ? (
              <div className="confirm-identity">
                <h2 className="confirm-identity-q">
                  {t('myPurchases.confirmPayQ', { amount: formatCOP(pending.amount), method: t('register.' + pending.method) })}
                </h2>
                {payError && <p className="pin-msg">{payError}</p>}
                <button className="btn-primary" style={{ width: '100%' }} disabled={paying} onClick={confirmPay}>
                  {paying ? t('myPurchases.processing') : t('myPurchases.confirmPay')}
                </button>
                <button className="btn-ghost" disabled={paying} onClick={() => { setPending(null); setPayError('') }}>
                  {t('myPurchases.cancel')}
                </button>
              </div>
            ) : (
              <>
                <div className="pay-all">
                  <span className="caption">{t('myPurchases.payAll')} · {formatCOP(debtTotal)}</span>
                  <div className="settle-actions">
                    <button className="btn-primary sm" onClick={() => askPay(myDebt.map(c => c.id), 'cash', debtTotal)}>
                      {t('register.cash')}
                    </button>
                    <button className="btn-primary sm" onClick={() => askPay(myDebt.map(c => c.id), 'transfer', debtTotal)}>
                      {t('register.transfer')}
                    </button>
                  </div>
                </div>

                <div className="settle-list">
                  {myDebt.map(c => {
                    const p = products.find(x => x.id === c.productId)
                    return (
                      <div key={c.id} className="settle-row">
                        <span className="prod-emoji">{p ? p.emoji : '🍬'}</span>
                        <div className="settle-meta">
                          <div className="compra-name">
                            {p ? p.name : '—'}
                            {c.quantity > 1 && <span className="qty"> × {c.quantity}</span>}
                          </div>
                          <div className="body-sm">{relativeDate(c.date, t, i18n.language)} · {formatCOP(priceOf(c))}</div>
                        </div>
                        <div className="settle-actions">
                          <button className="btn-ghost sm" onClick={() => askPay([c.id], 'cash', priceOf(c))}>
                            {t('register.cash')}
                          </button>
                          <button className="btn-ghost sm" onClick={() => askPay([c.id], 'transfer', priceOf(c))}>
                            {t('register.transfer')}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
