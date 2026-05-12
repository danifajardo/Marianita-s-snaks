import { useState, useMemo, useEffect } from 'react'
import { createIcons, icons } from 'lucide'
import { fmtCOP, fechaRelativa } from '../data'
import { MetodoBadge } from '../Components'

export default function MisCompras({ compras, productos, persona }) {
  const [filtro, setFiltro] = useState('todas')

  useEffect(() => { createIcons({ icons }) }, [filtro])

  const mias     = compras.filter(c => c.personaId === persona.id)
  const filtradas = filtro === 'todas' ? mias : mias.filter(c => c.metodo === filtro)
  const total    = filtradas.reduce((acc, c) => {
    const p = productos.find(x => x.id === c.productoId)
    return acc + (p ? p.precio * c.cantidad : 0)
  }, 0)

  const grupos = useMemo(() => {
    const g = {}
    filtradas.forEach(c => {
      const k = fechaRelativa(c.fecha)
      if (!g[k]) g[k] = []
      g[k].push(c)
    })
    return g
  }, [filtradas])

  return (
    <div className="view">
      <h1 className="view-title">Tus compras</h1>

      <div className="balance-card">
        <span className="caption">Le debes a Marianita</span>
        <div className="balance-amt">{fmtCOP(total)}</div>
        <span className="balance-sub">
          {filtradas.length} compra{filtradas.length !== 1 ? 's' : ''}{' '}
          {filtro !== 'todas' ? `en ${filtro}` : 'en total'}
        </span>
      </div>

      <div className="seg seg-filter">
        <button className={filtro === 'todas' ? 'on' : ''} onClick={() => setFiltro('todas')}>Todas</button>
        <button className={filtro === 'efectivo' ? 'on' : ''} onClick={() => setFiltro('efectivo')}>
          <span className="dot menta"></span>Efectivo
        </button>
        <button className={filtro === 'transferencia' ? 'on' : ''} onClick={() => setFiltro('transferencia')}>
          <span className="dot lavanda"></span>Transferencia
        </button>
      </div>

      {filtradas.length === 0 ? (
        <div className="empty">
          <div className="empty-emoji">😴</div>
          <h2>Sin dulces todavía</h2>
          <p>Date el gustico 🍬</p>
        </div>
      ) : (
        Object.entries(grupos).map(([fecha, items]) => (
          <div key={fecha} className="day-group">
            <div className="day-label">{fecha}</div>
            <div className="compra-list">
              {items.map(c => {
                const p = productos.find(x => x.id === c.productoId)
                if (!p) return null
                return (
                  <div key={c.id} className="compra-row">
                    <span className="compra-emoji">{p.emoji}</span>
                    <div className="compra-meta">
                      <div className="compra-name">
                        {p.nombre}
                        {c.cantidad > 1 && <span className="qty"> × {c.cantidad}</span>}
                      </div>
                      <MetodoBadge metodo={c.metodo} />
                    </div>
                    <span className="compra-amt mono">{fmtCOP(p.precio * c.cantidad)}</span>
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