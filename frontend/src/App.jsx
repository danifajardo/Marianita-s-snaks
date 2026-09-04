import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  getPersonas, postPersona, setPersonaStatus,
  loginUser, setUserPin, resetUserPin, logoutUser, getUserToken, setAdminToken,
  getProductos, postProducto, patchProducto,
  getCompras, postCompra, settleCompras,
} from './api'
import { Header, BottomNav, PersonPicker, PinGate, PendingApproval } from './Components'
import { isError } from './errors'
import RegisterPurchase from './views/RegisterPurchase'
import MyPurchases from './views/MyPurchases'
import MarianitaPanel from './views/MarianitaPanel'

// Duración de la sesión local. Pasado este lapso, al abrir la app se pide el PIN otra vez.
const SESSION_TTL_MS = 12 * 60 * 60 * 1000 // 12 horas

// Lee la sesión guardada solo si no expiró Y sigue teniendo token; si no, la limpia.
// El token es lo que realmente autoriza: sin él, el id guardado no sirve de nada.
const readSession = () => {
  try {
    const id  = localStorage.getItem('dulceria.personId')
    const exp = Number(localStorage.getItem('dulceria.sessionExp') || 0)
    if (id && exp && Date.now() < exp && getUserToken()) return id
  } catch { /* noop */ }
  clearSession()
  return null
}

const clearSession = () => {
  logoutUser()
  try {
    localStorage.removeItem('dulceria.personId')
    localStorage.removeItem('dulceria.sessionExp')
  } catch { /* noop */ }
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

  // Inicia sesión: el token ya lo guardó api.js al validar el PIN; aquí solo
  // registramos quién es y hasta cuándo dura la sesión local.
  const login = (id) => {
    setPersonId(id)
    try {
      localStorage.setItem('dulceria.personId', id)
      localStorage.setItem('dulceria.sessionExp', String(Date.now() + SESSION_TTL_MS))
    } catch { /* noop */ }
  }
  const logout = () => {
    clearSession()
    setPersonId(null)
    setIsAdminUnlocked(false)
  }

  // Carga inicial. Solo corre al montar: usa el personId de la sesión leída en el
  // useState inicial, por eso el array de dependencias va vacío a propósito.
  useEffect(() => {
    // Las compras exigen sesión: sin token ni las pedimos (daría 'No autenticado').
    const comprasIniciales = personId ? getCompras().catch(() => []) : Promise.resolve([])
    Promise.all([getPersonas(), getProductos(), comprasIniciales])
      .then(([personas, prods, compras]) => {
        setPersons(personas)
        setProducts(prods)
        setPurchases(compras)
        // Si el usuario logueado ya no puede usar la app (desactivado/rechazado) o le
        // resetearon el PIN, se cierra la sesión y deberá identificarse de nuevo.
        const me = personId ? personas.find(p => p.id === personId) : null
        const sessionOk = !!me && me.status === 'active' && me.hasPin !== false
        if (personId && !sessionOk) logout()
        setIsPickerOpen(!sessionOk)
      })
      .catch(err => {
        console.error('No se pudieron cargar los datos:', err)
        setIsPickerOpen(true)
      })
      .finally(() => setLoaded(true))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const currentPerson = persons.find(p => p.id === personId)
  const isActive       = currentPerson && currentPerson.status === 'active'
  const activePersons  = persons.filter(p => p.status === 'active')
  const pendingPersons = persons.filter(p => p.status === 'pending')
  const inactivePersons = persons.filter(p => p.status === 'inactive')

  // Refresca la persona en el estado local tras un login (puede no estar en la
  // lista pública todavía, p. ej. una recién registrada).
  const upsertPerson = (persona) => setPersons(prev =>
    prev.some(p => p.id === persona.id)
      ? prev.map(p => (p.id === persona.id ? { ...p, ...persona } : p))
      : [...prev, persona])

  // Tras identificarse hay token, así que ya se pueden pedir las compras propias.
  const loadMyPurchases = async () => {
    try {
      setPurchases(await getCompras())
    } catch (err) {
      console.error('No se pudieron cargar las compras:', err)
    }
  }

  const handleRegister = async ({ employeeId, name, phone, pin }) => {
    const newPerson = await postPersona({ employeeId, name, phone, pin })
    upsertPerson(newPerson)
    login(newPerson.id)
    setIsPickerOpen(false)
  }

  // PIN por usuario: verificar al seleccionarse, crear si no tiene, resetear (admin).
  // verifyPin/createPin dejan el token guardado en api.js si tienen éxito.
  // Devuelve false SOLO si el PIN no coincide (ERR-021); cualquier otro fallo
  // —bloqueo por intentos, cuenta desactivada, red— se propaga para que el
  // picker muestre el motivo real en vez de un genérico "PIN incorrecto".
  const verifyPin = async (id, pin) => {
    try {
      const persona = await loginUser(id, pin)
      upsertPerson(persona)
      await loadMyPurchases()
      return true
    } catch (err) {
      if (isError(err, 'ERR-021')) return false
      throw err
    }
  }
  const createPin = async (id, pin) => {
    const updated = await setUserPin(id, pin)
    upsertPerson(updated)
    await loadMyPurchases()
  }
  const resetPin = async (id) => {
    const updated = await resetUserPin(id)
    setPersons(prev => prev.map(p => (p.id === id ? { ...p, ...updated } : p)))
  }

  /**
   * Con el PIN de Mari validado ya hay token de admin: recargamos la lista completa
   * de personas (con teléfonos, pendientes e inactivas) y TODAS las compras, que la
   * sesión de empleado no tiene permiso para ver.
   */
  const unlockAdmin = async () => {
    setIsAdminUnlocked(true)
    try {
      const [personas, compras] = await Promise.all([
        getPersonas({ admin: true }),
        getCompras(null, { admin: true }),
      ])
      setPersons(personas)
      setPurchases(compras)
    } catch (err) {
      console.error('No se pudieron cargar los datos del panel:', err)
    }
  }

  const handleSetView = (v) => {
    // Al salir del panel se cierra la sesión de admin y se vuelve a los datos
    // propios: no queremos las compras de todo el mundo en memoria de más.
    if (v !== 'marianita' && isAdminUnlocked) {
      setIsAdminUnlocked(false)
      setAdminToken(null)
      getPersonas().then(setPersons).catch(() => {})
      if (personId) loadMyPurchases()
    }
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
            : <PinGate onSuccess={unlockAdmin} />
        )}
      </main>
      <BottomNav view={view} setView={handleSetView} />
      {isPickerOpen && (
        <PersonPicker
          persons={activePersons}
          value={personId}
          onChange={(id) => { login(id); setIsPickerOpen(false) }}
          onClose={() => setIsPickerOpen(false)}
          canClose={!!currentPerson}
          onRegister={handleRegister}
          onVerifyPin={verifyPin}
          onSetPin={createPin}
        />
      )}
    </div>
  )
}
