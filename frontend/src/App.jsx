import { useState, useEffect } from 'react'
import { createIcons } from 'lucide'
import * as icons from 'lucide'
import { useTranslation } from 'react-i18next'
import {
  getPersonas, postPersona,
  getProductos, postProducto, patchProducto,
  getCompras, postCompra, settleCompras,
} from './api'
import { Header, BottomNav, PersonPicker, PinGate } from './Components'
import RegisterPurchase from './views/RegisterPurchase'
import MyPurchases from './views/MyPurchases'
import MarianitaPanel from './views/MarianitaPanel'

export default function App() {
  const { t } = useTranslation()

  const [persons, setPersons]               = useState([])
  const [products, setProducts]             = useState([])
  const [purchases, setPurchases]           = useState([])
  const [view, setView]                     = useState('register')
  const [personId, setPersonId]             = useState(() => localStorage.getItem('dulceria.personId') || null)
  const [isPickerOpen, setIsPickerOpen]     = useState(false)
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false)
  const [loaded, setLoaded]                 = useState(false)

  useEffect(() => {
    Promise.all([getPersonas(), getProductos(), getCompras()])
      .then(([personas, prods, compras]) => {
        setPersons(personas)
        setProducts(prods)
        setPurchases(compras)
      })
      .catch(err => console.error('No se pudieron cargar los datos:', err))
      .finally(() => setLoaded(true))
  }, [])

  useEffect(() => {
    if (!loaded) return
    if (!personId || !persons.find(p => p.id === personId)) setIsPickerOpen(true)
  }, [loaded])

  useEffect(() => { if (personId) localStorage.setItem('dulceria.personId', personId) }, [personId])
  useEffect(() => { createIcons({ icons }) }, [view, isPickerOpen, isAdminUnlocked])

  const currentPerson = persons.find(p => p.id === personId)

  const handleRegister = async ({ employeeId, name, phone }) => {
    const newPerson = await postPersona({ employeeId, name, phone })
    setPersons(prev => [...prev, newPerson])
    setPersonId(newPerson.id)
    setIsPickerOpen(false)
  }

  const handleSetView = (v) => {
    if (v !== 'marianita') setIsAdminUnlocked(false)
    setView(v)
  }

  const handleConfirm = async ({ personId, method, items }) => {
    const created = await postCompra({ personId, method, items })
    setPurchases(prev => [...created, ...prev])
  }

  const toggleProduct = async (id) => {
    const current = products.find(p => p.id === id)
    if (!current) return
    const next = !current.active
    setProducts(prev => prev.map(p => p.id === id ? { ...p, active: next } : p))
    try {
      await patchProducto(id, { active: next })
    } catch (err) {
      console.error('No se pudo actualizar el producto, se revierte:', err)
      setProducts(prev => prev.map(p => p.id === id ? { ...p, active: current.active } : p))
    }
  }

  const editPrice = async (id, price) => {
    const current = products.find(p => p.id === id)
    if (!current) return
    const prevPrice = current.price
    setProducts(prev => prev.map(p => p.id === id ? { ...p, price } : p))
    try {
      await patchProducto(id, { price })
    } catch (err) {
      console.error('No se pudo actualizar el precio, se revierte:', err)
      setProducts(prev => prev.map(p => p.id === id ? { ...p, price: prevPrice } : p))
    }
  }

  const addProduct = async ({ name, price }) => {
    try {
      const newProduct = await postProducto({ name, price, emoji: '🍬', active: true })
      setProducts(prev => [...prev, newProduct])
    } catch (err) {
      console.error('No se pudo agregar el producto:', err)
    }
  }

  const settleDebts = async (compraIds, paidMethod) => {
    const updated = await settleCompras(compraIds, paidMethod)
    const byId = Object.fromEntries(updated.map(c => [c.id, c]))
    setPurchases(prev => prev.map(c => (byId[c.id] ? { ...c, ...byId[c.id] } : c)))
  }

  const titles = {
    register:    t('app.recordTitle'),
    myPurchases: t('app.historyTitle'),
    marianita:   t('app.panelTitle'),
  }

  return (
    <div className="app-shell">
      <Header
        title={titles[view]}
        person={view !== 'marianita' ? currentPerson : null}
        onChangeUser={() => setIsPickerOpen(true)}
      />
      <main className="app-main">
        {!loaded && (
          <div className="view-loading">
            <div className="spinner"></div>
            <p>{t('app.loading')}</p>
          </div>
        )}
        {loaded && view === 'register' && currentPerson && (
          <RegisterPurchase
            products={products}
            person={currentPerson}
            onConfirm={handleConfirm}
          />
        )}
        {loaded && view === 'myPurchases' && currentPerson && (
          <MyPurchases
            purchases={purchases}
            products={products}
            person={currentPerson}
            onSettle={settleDebts}
          />
        )}
        {loaded && view === 'marianita' && (
          isAdminUnlocked
            ? <MarianitaPanel
                purchases={purchases}
                products={products}
                persons={persons}
                onToggleProduct={toggleProduct}
                onEditPrice={editPrice}
                onAddProduct={addProduct}
              />
            : <PinGate onSuccess={() => setIsAdminUnlocked(true)} />
        )}
      </main>
      <BottomNav view={view} setView={handleSetView} />
      {isPickerOpen && (
        <PersonPicker
          persons={persons}
          value={personId}
          onChange={(id) => { setPersonId(id); setIsPickerOpen(false) }}
          onClose={() => { if (currentPerson) setIsPickerOpen(false) }}
          onRegister={handleRegister}
        />
      )}
    </div>
  )
}
