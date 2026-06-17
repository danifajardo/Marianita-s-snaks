import { useState, useEffect } from 'react'
import { createIcons } from 'lucide'
import * as icons from 'lucide'
import { useTranslation } from 'react-i18next'
import {
  getPersonas, postPersona, setPersonaStatus,
  verifyUserPin, setUserPin, resetUserPin,
  getProductos, postProducto, patchProducto,
  getCompras, postCompra, settleCompras,
} from './api'
import { Header, BottomNav, PersonPicker, PinGate, PendingApproval } from './Components'
import RegisterPurchase from './views/RegisterPurchase'
import MyPurchases from './views/MyPurchases'
import MarianitaPanel from './views/MarianitaPanel'

// Duración de la sesión local. Pasado este lapso, al abrir la app se pide el PIN otra vez.
const SESSION_TTL_MS = 12 * 60 * 60 * 1000 // 12 horas

// Lee la sesión guardada solo si no expiró; si expiró (o no tiene fecha), la limpia.
const readSession = () => {
  try {
    const id  = localStorage.getItem('dulceria.personId')
    const exp = Number(localStorage.getItem('dulceria.sessionExp') || 0)
    if (id && exp && Date.now() < exp) return id
  } catch { /* noop */ }
  try {
    localStorage.removeItem('dulceria.personId')
    localStorage.removeItem('dulceria.sessionExp')
  } catch { /* noop */ }
  return null
}

export default function App() {
  const { t } = useTranslation()

  const [persons, setPersons]               = useState([])
  const [products, setProducts]             = useState([])
  const [purchases, setPurchases]           = useState([])
  const [view, setView]                     = useState('register')
  const [personId, setPersonId]             = useState(() => readSession())
  const [isPickerOpen, setIsPickerOpen]     = useState(false)
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false)
  const [loaded, setLoaded]                 = useState(false)

  // Inicia sesión: guarda el usuario y una fecha de expiración (vence en SESSION_TTL_MS).
  const login = (id) => {
    setPersonId(id)
    try {
      localStorage.setItem('dulceria.personId', id)
      localStorage.setItem('dulceria.sessionExp', String(Date.now() + SESSION_TTL_MS))
    } catch { /* noop */ }
  }
  const logout = () => {
    try {
      localStorage.removeItem('dulceria.personId')
      localStorage.removeItem('dulceria.sessionExp')
    } catch { /* noop */ }
    setPersonId(null)
  }

  useEffect(() => {
    Promise.all([getPersonas(), getProductos(), getCompras()])
      .then(([personas, prods, compras]) => {
        setPersons(personas)
        setProducts(prods)
        setPurchases(compras)
        // Si el usuario logueado ya no puede usar la app (desactivado/rechazado) o le
        // resetearon el PIN, se cierra la sesión y deberá identificarse de nuevo.
        if (personId) {
          const me = personas.find(p => p.id === personId)
          if (!me || me.status !== 'active' || me.hasPin === false) logout()
        }
      })
      .catch(err => console.error('No se pudieron cargar los datos:', err))
      .finally(() => setLoaded(true))
  }, [])

  useEffect(() => {
    if (!loaded) return
    if (!personId || !persons.find(p => p.id === personId)) setIsPickerOpen(true)
  }, [loaded])

  useEffect(() => { createIcons({ icons }) }, [view, isPickerOpen, isAdminUnlocked])

  const currentPerson = persons.find(p => p.id === personId)
  const isActive       = currentPerson && currentPerson.status === 'active'
  const activePersons  = persons.filter(p => p.status === 'active')
  const pendingPersons = persons.filter(p => p.status === 'pending')
  const inactivePersons = persons.filter(p => p.status === 'inactive')

  const handleRegister = async ({ employeeId, name, phone, pin }) => {
    const newPerson = await postPersona({ employeeId, name, phone, pin })
    setPersons(prev => [...prev, newPerson])
    login(newPerson.id)
    setIsPickerOpen(false)
  }

  // PIN por usuario: verificar al seleccionarse, crear si no tiene, resetear (admin).
  const verifyPin = (id, pin) => verifyUserPin(id, pin)
  const createPin = async (id, pin) => {
    const updated = await setUserPin(id, pin)
    setPersons(prev => prev.map(p => (p.id === id ? { ...p, ...updated } : p)))
  }
  const resetPin = async (id) => {
    const updated = await resetUserPin(id)
    setPersons(prev => prev.map(p => (p.id === id ? { ...p, ...updated } : p)))
  }

  const handleSetView = (v) => {
    if (v !== 'marianita') setIsAdminUnlocked(false)
    setView(v)
  }

  const handleConfirm = async ({ personId, method, items }) => {
    const created = await postCompra({ personId, method, items })
    setPurchases(prev => [...created, ...prev])
    // Descuento optimista de stock (el backend ya lo descontó de forma autoritativa).
    setProducts(prev => prev.map(p => {
      const it = items.find(i => i.productId === p.id)
      return it ? { ...p, stock: (p.stock ?? 0) - it.quantity } : p
    }))
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

  const editStock = async (id, stock) => {
    const current = products.find(p => p.id === id)
    if (!current) return
    const prevStock = current.stock
    setProducts(prev => prev.map(p => p.id === id ? { ...p, stock } : p))
    try {
      await patchProducto(id, { stock })
    } catch (err) {
      console.error('No se pudo actualizar el stock, se revierte:', err)
      setProducts(prev => prev.map(p => p.id === id ? { ...p, stock: prevStock } : p))
    }
  }

  const addProduct = async ({ name, price, stock }) => {
    try {
      const newProduct = await postProducto({ name, price, stock, emoji: '🍬', active: true })
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

  const setStatus = async (id, status) => {
    const updated = await setPersonaStatus(id, status)
    setPersons(prev => prev.map(p => (p.id === id ? { ...p, ...updated } : p)))
  }
  const approvePerson    = (id) => setStatus(id, 'active')
  const rejectPerson     = (id) => setStatus(id, 'rejected')
  const deactivatePerson = (id) => setStatus(id, 'inactive')
  const reactivatePerson = (id) => setStatus(id, 'active')

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
        {loaded && view !== 'marianita' && currentPerson && !isActive && (
          <PendingApproval onChangeUser={() => setIsPickerOpen(true)} />
        )}
        {loaded && view === 'register' && isActive && (
          <RegisterPurchase
            products={products}
            person={currentPerson}
            onConfirm={handleConfirm}
          />
        )}
        {loaded && view === 'myPurchases' && isActive && (
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
                pendingPersons={pendingPersons}
                inactivePersons={inactivePersons}
                onToggleProduct={toggleProduct}
                onEditPrice={editPrice}
                onEditStock={editStock}
                onAddProduct={addProduct}
                onApprovePerson={approvePerson}
                onRejectPerson={rejectPerson}
                onResetPin={resetPin}
                onDeactivatePerson={deactivatePerson}
                onReactivatePerson={reactivatePerson}
              />
            : <PinGate onSuccess={() => setIsAdminUnlocked(true)} />
        )}
      </main>
      <BottomNav view={view} setView={handleSetView} />
      {isPickerOpen && (
        <PersonPicker
          persons={activePersons}
          value={personId}
          onChange={(id) => { login(id); setIsPickerOpen(false) }}
          onClose={() => { if (currentPerson) setIsPickerOpen(false) }}
          onRegister={handleRegister}
          onVerifyPin={verifyPin}
          onSetPin={createPin}
        />
      )}
    </div>
  )
}
