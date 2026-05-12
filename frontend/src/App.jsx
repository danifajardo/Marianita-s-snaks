import { useState, useEffect } from 'react'
import { createIcons, icons } from 'lucide'
import { personas, productosIniciales, comprasIniciales } from './data'
import RegistrarCompra from './views/RegistrarCompra'
import MisCompras from './views/MisCompras'
import PanelMarianita from './views/PanelMarianita'
import { Header, BottomNav, PersonaPicker } from './Components'

export default function App() {
  const [productos, setProductos] = useState(productosIniciales)
  const [compras, setCompras]     = useState(comprasIniciales)
  const [vista, setVista]         = useState('registrar')
  const [personaId, setPersonaId] = useState(
    () => localStorage.getItem('dulceria.persona') || 'marcela'
  )
  const [picker, setPicker] = useState(false)

  useEffect(() => { localStorage.setItem('dulceria.persona', personaId) }, [personaId])
  useEffect(() => { createIcons({ icons }) }, [vista, picker])

  const persona = personas.find(p => p.id === personaId) || personas[0]

  const handleConfirmar = ({ personaId, metodo, items }) => {
    const fecha = new Date().toISOString()
    const nuevos = items.map((it, i) => ({
      id: 'c-' + Date.now() + '-' + i,
      personaId,
      productoId: it.productoId,
      cantidad: it.cantidad,
      metodo,
      fecha,
    }))
    setCompras(prev => [...nuevos, ...prev])
  }

  const toggleProducto = (id) =>
    setProductos(prev => prev.map(p => p.id === id ? { ...p, activo: !p.activo } : p))

  const editPrecio = (id, precio) =>
    setProductos(prev => prev.map(p => p.id === id ? { ...p, precio } : p))

  const addProducto = ({ nombre, precio }) =>
    setProductos(prev => [
      ...prev,
      { id: 'p-' + Date.now(), nombre, emoji: '🍬', precio, activo: true },
    ])

  const titulos = {
    registrar: 'Anotar lo de hoy',
    mias:      'Tu historial',
    marianita: 'Cuentas de Marianita',
  }

  return (
    <div className="app-shell">
      <Header
        titulo={titulos[vista]}
        persona={persona}
        onCambiarPersona={() => setPicker(true)}
      />
      <main className="app-main">
        {vista === 'registrar' && (
          <RegistrarCompra
            productos={productos}
            persona={persona}
            onConfirmar={handleConfirmar}
          />
        )}
        {vista === 'mias' && (
          <MisCompras
            compras={compras}
            productos={productos}
            persona={persona}
          />
        )}
        {vista === 'marianita' && (
          <PanelMarianita
            compras={compras}
            productos={productos}
            personas={personas}
            onToggleProducto={toggleProducto}
            onEditPrecio={editPrecio}
            onAddProducto={addProducto}
          />
        )}
      </main>
      <BottomNav vista={vista} setVista={setVista} />
      {picker && (
        <PersonaPicker
          personas={personas}
          value={personaId}
          onChange={setPersonaId}
          onClose={() => setPicker(false)}
        />
      )}
    </div>
  )
}