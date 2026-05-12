import { useState, useMemo, useEffect } from 'react'
import { createIcons, icons } from 'lucide'
import { fmtCOP } from '../data'

export default function PanelMarianita({ compras, productos, personas, onToggleProducto, onEditPrecio, onAddProducto }) {
  const [rango, setRango]         = useState('semana')
  const [tab, setTab]             = useState('resumen')
  const [editandoId, setEditandoId] = useState(null)
  const [precioTmp, setPrecioTmp] = useState('')
  const [agregando, setAgregando] = useState(false)
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevoPrecio, setNuevoPrecio] = useState('')

  useEffect(() => { createIcons({ icons }) }, [rango, tab, editandoId, agregando, productos])

  const dentroRango = (iso) => {
    const dias = (new Date() - new Date(iso)) / (1000 * 60 * 60 * 24)
    if (rango === 'hoy')    return dias < 1
    if (rango === 'semana') return dias < 7
    if (rango === 'mes')    return dias < 30
    return true
  }

  const filtradas     = compras.filter(c => dentroRango(c.fecha))
  const totalCompra   = (c) => {
    const p = productos.find(x => x.id === c.productoId)
    return p ? p.precio * c.cantidad : 0
  }
  const totalGeneral  = filtradas.reduce((a, c) => a + totalCompra(c), 0)
  const totalEfectivo = filtradas.filter(c => c.metodo === 'efectivo').reduce((a, c) => a + totalCompra(c), 0)
  const totalTransfer = filtradas.filter(c => c.metodo === 'transferencia').reduce((a, c) => a + totalCompra(c), 0)

  const deudas = useMemo(() => {
    const map = {}
    filtradas.forEach(c => { map[c.personaId] = (map[c.personaId] || 0) + totalCompra(c) })
    return personas
      .map(p => ({ persona: p, total: map[p.id] || 0 }))
      .filter(x => x.total > 0)
      .sort((a, b) => b.total - a.total)
  }, [filtradas, personas, productos])

  const startEdit = (p) => { setEditandoId(p.id); setPrecioTmp(String(p.precio)) }
  const saveEdit  = () => {
    const n = parseInt(precioTmp.replace(/\D/g, ''), 10)
    if (!isNaN(n) && n > 0) onEditPrecio(editandoId, n)
    setEditandoId(null)
  }
  const handleAdd = () => {
    const n = parseInt(nuevoPrecio.replace(/\D/g, ''), 10)
    if (nuevoNombre.trim() && !isNaN(n) && n > 0) {
      onAddProducto({ nombre: nuevoNombre.trim(), precio: n })
      setNuevoNombre(''); setNuevoPrecio(''); setAgregando(false)
    }
  }

  const labelRango = { hoy: 'de hoy', semana: 'de la semana', mes: 'del mes', todo: 'histórico' }

  return (
    <div className="view wide">
      <div className="view-head-row">
        <h1 className="view-title">Panel de Marianita</h1>
        <div className="seg seg-filter sm">
          {[['hoy','Hoy'],['semana','Esta semana'],['mes','Este mes'],['todo','Todo']].map(([id, label]) => (
            <button key={id} className={rango === id ? 'on' : ''} onClick={() => setRango(id)}>{label}</button>
          ))}
        </div>
      </div>

      <div className="totales-grid">
        <div className="total-card grande">
          <span className="caption">Total {labelRango[rango]}</span>
          <div className="total-amt fresa">{fmtCOP(totalGeneral)}</div>
        </div>
        <div className="total-card">
          <span className="caption"><span className="dot menta"></span> Efectivo</span>
          <div className="total-amt">{fmtCOP(totalEfectivo)}</div>
        </div>
        <div className="total-card">
          <span className="caption"><span className="dot lavanda"></span> Transferencia</span>
          <div className="total-amt">{fmtCOP(totalTransfer)}</div>
        </div>
      </div>

      <div className="tabs">
        <button className={tab === 'resumen' ? 'on' : ''} onClick={() => setTab('resumen')}>
          <i data-lucide="users"></i>Quién debe
        </button>
        <button className={tab === 'productos' ? 'on' : ''} onClick={() => setTab('productos')}>
          <i data-lucide="package"></i>Productos
        </button>
      </div>

      {tab === 'resumen' && (
        <div className="card">
          {deudas.length === 0 ? (
            <div className="empty small">
              <div className="empty-emoji">🌤️</div>
              <h2>Está todo al día</h2>
              <p>Nadie debe nada en este período.</p>
            </div>
          ) : (
            <table className="deudas-table">
              <thead>
                <tr>
                  <th>Persona</th><th>Compras</th><th style={{ textAlign: 'right' }}>Debe</th>
                </tr>
              </thead>
              <tbody>
                {deudas.map(({ persona, total }, i) => {
                  const cnt = filtradas.filter(c => c.personaId === persona.id).length
                  return (
                    <tr key={persona.id}>
                      <td>
                        <div className="persona-cell">
                          <span className="avatar">{persona.inicial}</span>
                          <div>
                            <div className="persona-name">{persona.nombre}</div>
                            <div className="persona-area">{persona.area}</div>
                          </div>
                          {i === 0 && <span className="rank-badge">#1</span>}
                        </div>
                      </td>
                      <td className="body-sm">{cnt} compra{cnt !== 1 ? 's' : ''}</td>
                      <td className="mono amt">{fmtCOP(total)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'productos' && (
        <div className="card">
          <div className="productos-list">
            {productos.map(p => (
              <div key={p.id} className={'prod-row ' + (p.activo ? '' : 'off')}>
                <span className="prod-emoji">{p.emoji}</span>
                <div className="prod-meta">
                  <div className="prod-name">{p.nombre}</div>
                  {editandoId === p.id ? (
                    <div className="prod-edit">
                      <input className="precio-input" value={precioTmp} onChange={e => setPrecioTmp(e.target.value)} autoFocus />
                      <button className="btn-primary sm" onClick={saveEdit}>Guardar</button>
                      <button className="btn-ghost sm" onClick={() => setEditandoId(null)}>Cancelar</button>
                    </div>
                  ) : (
                    <button className="prod-price" onClick={() => startEdit(p)}>
                      {fmtCOP(p.precio)} <i data-lucide="pencil"></i>
                    </button>
                  )}
                </div>
                <label className="toggle">
                  <input type="checkbox" checked={p.activo} onChange={() => onToggleProducto(p.id)} />
                  <span className="toggle-track"><span className="toggle-thumb"></span></span>
                  <span className="toggle-label">{p.activo ? 'Disponible' : 'Agotado'}</span>
                </label>
              </div>
            ))}
          </div>
          {agregando ? (
            <div className="prod-add">
              <input placeholder="Nombre del producto" value={nuevoNombre} onChange={e => setNuevoNombre(e.target.value)} />
              <input placeholder="Precio" value={nuevoPrecio} onChange={e => setNuevoPrecio(e.target.value)} />
              <button className="btn-primary" onClick={handleAdd}>Agregar</button>
              <button className="btn-ghost" onClick={() => setAgregando(false)}>Cancelar</button>
            </div>
          ) : (
            <button className="btn-add-prod" onClick={() => setAgregando(true)}>
              <i data-lucide="plus"></i> Agregar producto
            </button>
          )}
        </div>
      )}
    </div>
  )
}