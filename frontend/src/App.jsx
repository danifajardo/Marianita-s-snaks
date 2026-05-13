import { useState, useEffect } from 'react'
import { createIcons } from 'lucide'
import * as icons from 'lucide'
import { useTranslation } from 'react-i18next'
import { initialPersons, initialProducts, initialPurchases } from './data'
import { Header, BottomNav, PersonPicker, PinGate } from './Components'
import RegisterPurchase from './views/RegisterPurchase'
import MyPurchases from './views/MyPurchases'
import MarianitaPanel from './views/MarianitaPanel'

const loadFromStorage = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback }
  catch { return fallback }
}

export default function App() {
  const { t } = useTranslation()

  const [persons, setPersons]             = useState(() => loadFromStorage('dulceria.persons', initialPersons))
  const [products, setProducts]           = useState(initialProducts)
  const [purchases, setPurchases]         = useState(() => loadFromStorage('dulceria.purchases', initialPurchases))
  const [view, setView]                   = useState('register')
  const [personId, setPersonId]           = useState(() => localStorage.getItem('dulceria.personId') || null)
  const [isPickerOpen, setIsPickerOpen]   = useState(false)
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false)

  useEffect(() => { localStorage.setItem('dulceria.persons',   JSON.stringify(persons))   }, [persons])
  useEffect(() => { localStorage.setItem('dulceria.purchases', JSON.stringify(purchases)) }, [purchases])
  useEffect(() => { if (personId) localStorage.setItem('dulceria.personId', personId)    }, [personId])
  useEffect(() => { createIcons({ icons }) }, [view, isPickerOpen, isAdminUnlocked])

  useEffect(() => {
    if (!personId || !persons.find(p => p.id === personId)) setIsPickerOpen(true)
  }, [])

  const currentPerson = persons.find(p => p.id === personId)

  const handleRegister = ({ employeeId, name, phone }) => {
    const newPerson = {
      id:         'u-' + employeeId,
      employeeId,
      name,
      phone,
      initial:    name.charAt(0).toUpperCase(),
    }
    setPersons(prev => [...prev, newPerson])
    setPersonId(newPerson.id)
  }

  const handleSetView = (v) => {
    if (v !== 'marianita') setIsAdminUnlocked(false)
    setView(v)
  }

  const handleConfirm = ({ personId, method, items }) => {
    const date   = new Date().toISOString()
    const newPurchases = items.map((item, i) => ({
      id:        'c-' + Date.now() + '-' + i,
      personId,
      productId: item.productId,
      quantity:  item.quantity,
      method,
      date,
    }))
    setPurchases(prev => [...newPurchases, ...prev])
  }

  const toggleProduct = (id) =>
    setProducts(prev => prev.map(p => p.id === id ? { ...p, active: !p.active } : p))

  const editPrice = (id, price) =>
    setProducts(prev => prev.map(p => p.id === id ? { ...p, price } : p))

  const addProduct = ({ name, price }) =>
    setProducts(prev => [
      ...prev,
      { id: 'p-' + Date.now(), name, emoji: '🍬', price, active: true },
    ])

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
        {view === 'register' && currentPerson && (
          <RegisterPurchase
            products={products}
            person={currentPerson}
            onConfirm={handleConfirm}
          />
        )}
        {view === 'myPurchases' && currentPerson && (
          <MyPurchases
            purchases={purchases}
            products={products}
            person={currentPerson}
          />
        )}
        {view === 'marianita' && (
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
          onChange={setPersonId}
          onClose={() => { if (currentPerson) setIsPickerOpen(false) }}
          onRegister={handleRegister}
        />
      )}
    </div>
  )
}
