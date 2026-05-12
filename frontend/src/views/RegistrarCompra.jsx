import { useState, useMemo, useEffect } from 'react'
import { createIcons, icons } from 'lucide'
import { fmtCOP } from '../data'

export default function RegistrarCompra({ productos, persona, onConfirmar }) {
  const [carrito, setCarrito]     = useState({})
  const [metodo, setMetodo]       = useState('efectivo')
  const [confirmado, setConfirmado] = useState(false)

  useEffect(() => { createIcons({ icons }) }, [carrito, metodo, confirmado])

  const productosActivos = productos.filter(p => p.activo)
  const cantidadTotal    = Object.values(carrito).reduce((a, b) => a + b, 0)
  const total = useMemo(() =>
    Object.entries(carrito).reduce((acc, [pid, cant]) => {
      const p = productos.find(x => x.id === pid)
      return acc + (p ? p.precio * cant : 0)
    }, 0)
  , [carrito, productos])

  const toggle = (pid) =>
    setCarrito(prev => ({ ...prev, [pid]: (prev[pid] || 0) + 1 }))

  const restar = (pid, e) => {
    e.stopPropagation()
    setCarrito(prev => {
      const next = { ...prev }
      next[pid] = (next[pid] || 0) - 1
      if (next[pid] <= 0) delete next[pid]
      return next
    })
  }

  const confirmar = () => {
    const items = Object.entries(carrito).map(([pid, cant]) => ({
      productoId: pid, cantidad: cant,
    }))
    onConfirmar({ personaId: persona.id, metodo, items, total })
    setConfirmado(true)
    setTimeout(() => { setCarrito({}); setConfirmado(false) }, 2400)
  }

  if (confirmado) {
    return (
      <div className="confirm-screen">
        <div className="confirm-pop">
          <div className="confirm-circle"><i data-lucide="check"></i></div>
          <h1>¡Listo!</h1>
          <p className="confirm-msg">Ya quedó anotado, {persona.nombre.split(' ')[0]} 🍬</p>
          <p className="confirm-amt">
            {fmtCOP(total)} · {metodo === 'efectivo' ? 'efectivo' : 'transferencia'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="view">
      <h1 className="view-title">¿Qué te vas a comer hoy?</h1>
      <p className="view-sub">Elige el (los) producto(s) que vas a llevar</p>

      <div className="product-grid">
        {productosActivos.map(p => {
          const cant = carrito[p.id] || 0
          return (
            <button
              key={p.id}
              className={'product-card ' + (cant > 0 ? 'selected' : '')}
              onClick={() => toggle(p.id)}
            >
              {cant > 0 && (
                <span className="qty-bubble">
                  {cant}
                  <span className="qty-minus" onClick={(e) => restar(p.id, e)}>−</span>
                </span>
              )}
              <span className="product-emoji">{p.emoji}</span>
              <span className="product-name">{p.nombre}</span>
              <span className="product-price">{fmtCOP(p.precio)}</span>
            </button>
          )
        })}
      </div>

      {cantidadTotal > 0 && (
        <div className="checkout-bar">
          <div className="checkout-method">
            <span className="caption">¿Cómo pagaste?</span>
            <div className="seg">
              <button className={metodo === 'efectivo' ? 'on' : ''} onClick={() => setMetodo('efectivo')}>
                <span className="dot menta"></span>Efectivo
              </button>
              <button className={metodo === 'transferencia' ? 'on' : ''} onClick={() => setMetodo('transferencia')}>
                <span className="dot lavanda"></span>Transferencia
              </button>
            </div>
          </div>
          <button className="btn-primary big" onClick={confirmar}>
            <span>Anotar compra</span>
            <span className="checkout-total">{fmtCOP(total)}</span>
          </button>
        </div>
      )}
    </div>
  )
}