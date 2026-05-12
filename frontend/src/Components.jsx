import { useEffect } from 'react'
import { createIcons, icons } from 'lucide'

export function Header({ titulo, persona, onCambiarPersona }) {
  useEffect(() => { createIcons({ icons }) })
  return (
    <header className="app-header">
      <div className="brand">
        <div className="brand-mark">🍬</div>
        <div>
          <div className="brand-word">Dulcería</div>
          <div className="brand-sub">{titulo}</div>
        </div>
      </div>
      {persona && (
        <button className="who" onClick={onCambiarPersona}>
          <span className="avatar">{persona.inicial}</span>
          <span className="who-name">{persona.nombre.split(' ')[0]}</span>
          <i data-lucide="chevron-down"></i>
        </button>
      )}
    </header>
  )
}

export function BottomNav({ vista, setVista }) {
  useEffect(() => { createIcons({ icons }) })
  const items = [
    { id: 'registrar', icono: 'shopping-bag', label: 'Anotar' },
    { id: 'mias',      icono: 'clock',        label: 'Mis compras' },
    { id: 'marianita', icono: 'package',      label: 'Marianita' },
  ]
  return (
    <nav className="bottom-nav">
      {items.map(it => (
        <button
          key={it.id}
          className={'nav-item ' + (vista === it.id ? 'active' : '')}
          onClick={() => setVista(it.id)}
        >
          <i data-lucide={it.icono}></i>
          <span>{it.label}</span>
        </button>
      ))}
    </nav>
  )
}

export function MetodoBadge({ metodo }) {
  useEffect(() => { createIcons({ icons }) })
  return (
    <span className={'badge metodo-' + metodo}>
      <i data-lucide={metodo === 'efectivo' ? 'banknote' : 'arrow-right-left'}></i>
      {metodo === 'efectivo' ? 'Efectivo' : 'Transferencia'}
    </span>
  )
}

export function PersonaPicker({ personas, value, onChange, onClose }) {
  useEffect(() => { createIcons({ icons }) })
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h2>¿Quién compra?</h2>
          <button className="icon-btn" onClick={onClose}>
            <i data-lucide="x"></i>
          </button>
        </div>
        <div className="persona-list">
          {personas.map(p => (
            <button
              key={p.id}
              className={'persona-row ' + (value === p.id ? 'sel' : '')}
              onClick={() => { onChange(p.id); onClose() }}
            >
              <span className="avatar lg">{p.inicial}</span>
              <span className="persona-meta">
                <span className="persona-name">{p.nombre}</span>
                <span className="persona-area">{p.area}</span>
              </span>
              {value === p.id && <i data-lucide="check" className="sel-check"></i>}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}