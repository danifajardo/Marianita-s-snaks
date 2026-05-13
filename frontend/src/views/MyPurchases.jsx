import { useState, useMemo, useEffect } from 'react'
import { createIcons, icons } from 'lucide'
import { useTranslation } from 'react-i18next'
import { formatCOP, relativeDate } from '../data'
import { MetodoBadge } from '../Components'

export default function MyPurchases({ purchases, products, person }) {
  const { t, i18n } = useTranslation()
  const [filter, setFilter] = useState('all')

  useEffect(() => { createIcons({ icons }) }, [filter])

  const myPurchases = purchases.filter(c => c.personId === person.id)
  const filtered    = filter === 'all' ? myPurchases : myPurchases.filter(c => c.method === filter)
  const total       = filtered.reduce((acc, c) => {
    const p = products.find(x => x.id === c.productId)
    return acc + (p ? p.price * c.quantity : 0)
  }, 0)

  const groups = useMemo(() => {
    const g = {}
    filtered.forEach(c => {
      const key = relativeDate(c.date, t, i18n.language)
      if (!g[key]) g[key] = []
      g[key].push(c)
    })
    return g
  }, [filtered, i18n.language])

  const filterLabel = filter === 'all'
    ? t('myPurchases.inTotal')
    : filter === 'cash'
      ? t('myPurchases.inCash')
      : t('myPurchases.inTransfer')

  return (
    <div className="view">
      <h1 className="view-title">{t('myPurchases.title')}</h1>

      <div className="balance-card">
        <span className="caption">{t('myPurchases.owedTo')}</span>
        <div className="balance-amt">{formatCOP(total)}</div>
        <span className="balance-sub">
          {t('myPurchases.count', { count: filtered.length })} · {filterLabel}
        </span>
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
                      <MetodoBadge method={c.method} />
                    </div>
                    <span className="compra-amt mono">{formatCOP(p.price * c.quantity)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
