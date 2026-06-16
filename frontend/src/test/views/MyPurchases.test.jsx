import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MyPurchases from '../../views/MyPurchases'

vi.mock('lucide')
vi.mock('react-i18next')

const products = [
  { id: 'p1', name: 'Chokis',  emoji: '🍪', price: 2000, active: true },
  { id: 'p2', name: 'Doritos', emoji: '🌽', price: 2800, active: true },
]

const person = { id: 'u-1', employeeId: '001', name: 'Ana Gómez', initial: 'A' }

const mkPurchase = (id, productId, method, daysAgo = 0) => ({
  id,
  personId: 'u-1',
  productId,
  quantity: 1,
  method,
  date: new Date(Date.now() - daysAgo * 86400000).toISOString(),
})

// Devuelve el botón del filtro por su texto exacto (evita colisión con MetodoBadge)
const filterBtn = (name) => screen.getByRole('button', { name })

beforeEach(() => vi.clearAllMocks())

describe('MyPurchases — estado vacío', () => {
  it('muestra el estado vacío cuando no hay compras', () => {
    render(<MyPurchases purchases={[]} products={products} person={person} />)
    expect(screen.getByText('Nothing yet')).toBeInTheDocument()
  })

  it('muestra el balance en cero cuando no hay compras', () => {
    render(<MyPurchases purchases={[]} products={products} person={person} />)
    expect(screen.getByText('$ 0')).toBeInTheDocument()
  })
})

describe('MyPurchases — listado de compras', () => {
  it('muestra las compras de la persona agrupadas por fecha', () => {
    const purchases = [mkPurchase('c1', 'p1', 'cash')]
    render(<MyPurchases purchases={purchases} products={products} person={person} />)
    expect(screen.getByText('Chokis')).toBeInTheDocument()
  })

  it('no muestra compras de otras personas', () => {
    const otraPurchase = {
      id: 'c-otro', personId: 'u-99', productId: 'p1',
      quantity: 1, method: 'cash', date: new Date().toISOString(),
    }
    render(<MyPurchases purchases={[otraPurchase]} products={products} person={person} />)
    expect(screen.getByText('Nothing yet')).toBeInTheDocument()
  })

  it('usa el precio congelado (unitPrice) de la compra, no el precio actual del producto', () => {
    // p1 hoy cuesta 2000, pero se fió a 1500 → debe usar 1500
    const purchases = [{
      id: 'c1', personId: 'u-1', productId: 'p1', quantity: 2,
      method: 'debt', unitPrice: 1500, date: new Date().toISOString(),
    }]
    render(<MyPurchases purchases={purchases} products={products} person={person} onSettle={vi.fn()} />)
    const balanceCard = screen.getByText('You owe Marianita').closest('.balance-card')
    expect(within(balanceCard).getByText('$ 3.000')).toBeInTheDocument()
  })

  it('el saldo "You owe" suma solo lo fiado (debe), no lo ya pagado', () => {
    const purchases = [
      mkPurchase('c1', 'p1', 'debt'),     // 2000 debe
      mkPurchase('c2', 'p2', 'cash'),     // 2800 pagado → no cuenta
      mkPurchase('c3', 'p1', 'debt'),     // 2000 debe
    ]
    render(<MyPurchases purchases={purchases} products={products} person={person} />)
    const balanceCard = screen.getByText('You owe Marianita').closest('.balance-card')
    expect(within(balanceCard).getByText('$ 4.000')).toBeInTheDocument()
  })

  it('muestra el emoji del producto en cada fila', () => {
    const purchases = [mkPurchase('c1', 'p1', 'cash')]
    render(<MyPurchases purchases={purchases} products={products} person={person} />)
    expect(screen.getByText('🍪')).toBeInTheDocument()
  })

  it('omite silenciosamente compras con producto desconocido sin romperse', () => {
    const purchases = [mkPurchase('c1', 'DESCONOCIDO', 'cash')]
    render(<MyPurchases purchases={purchases} products={products} person={person} />)
    expect(screen.queryByText('Chokis')).not.toBeInTheDocument()
    // filtered.length = 1, por lo que el estado vacío NO se muestra
    expect(screen.queryByText('Nothing yet')).not.toBeInTheDocument()
  })

  it('muestra "× N" cuando la cantidad es mayor a 1', () => {
    const purchase = { ...mkPurchase('c1', 'p1', 'cash'), quantity: 3 }
    render(<MyPurchases purchases={[purchase]} products={products} person={person} />)
    expect(screen.getByText('× 3')).toBeInTheDocument()
  })

  it('no muestra el multiplicador cuando la cantidad es exactamente 1', () => {
    render(<MyPurchases purchases={[mkPurchase('c1', 'p1', 'cash')]} products={products} person={person} />)
    expect(screen.queryByText(/× 1/)).not.toBeInTheDocument()
  })
})

describe('MyPurchases — filtros', () => {
  const purchases = [
    mkPurchase('c1', 'p1', 'cash'),
    mkPurchase('c2', 'p2', 'transfer'),
  ]

  it('muestra todas las compras con el filtro "All" por defecto', () => {
    render(<MyPurchases purchases={purchases} products={products} person={person} />)
    expect(screen.getByText('Chokis')).toBeInTheDocument()
    expect(screen.getByText('Doritos')).toBeInTheDocument()
  })

  it('el filtro "Cash" muestra solo compras en efectivo', async () => {
    const user = userEvent.setup()
    render(<MyPurchases purchases={purchases} products={products} person={person} />)
    await user.click(filterBtn('Cash'))
    expect(screen.getByText('Chokis')).toBeInTheDocument()
    expect(screen.queryByText('Doritos')).not.toBeInTheDocument()
  })

  it('el filtro "Transfer" muestra solo transferencias', async () => {
    const user = userEvent.setup()
    render(<MyPurchases purchases={purchases} products={products} person={person} />)
    await user.click(filterBtn('Transfer'))
    expect(screen.getByText('Doritos')).toBeInTheDocument()
    expect(screen.queryByText('Chokis')).not.toBeInTheDocument()
  })

  it('el filtro "All" restaura todas las compras tras un filtro previo', async () => {
    const user = userEvent.setup()
    render(<MyPurchases purchases={purchases} products={products} person={person} />)
    await user.click(filterBtn('Cash'))
    await user.click(filterBtn('All'))
    expect(screen.getByText('Chokis')).toBeInTheDocument()
    expect(screen.getByText('Doritos')).toBeInTheDocument()
  })

  it('el filtro "On tab" muestra solo las compras fiadas', async () => {
    const user = userEvent.setup()
    const conDeuda = [
      mkPurchase('c1', 'p1', 'debt'), // Chokis fiado
      mkPurchase('c2', 'p2', 'cash'), // Doritos pagado
    ]
    render(<MyPurchases purchases={conDeuda} products={products} person={person} />)
    await user.click(filterBtn('On tab'))
    expect(screen.getByText('Chokis')).toBeInTheDocument()
    expect(screen.queryByText('Doritos')).not.toBeInTheDocument()
  })

  it('el saldo no cambia al filtrar el historial (siempre es la deuda)', async () => {
    const user = userEvent.setup()
    const conDeuda = [
      mkPurchase('c1', 'p1', 'debt'), // 2000 debe
      mkPurchase('c2', 'p2', 'cash'), // 2800 pagado
    ]
    render(<MyPurchases purchases={conDeuda} products={products} person={person} />)
    const balance = () => within(screen.getByText('You owe Marianita').closest('.balance-card'))
    expect(balance().getByText('$ 2.000')).toBeInTheDocument()
    await user.click(filterBtn('Cash'))
    expect(balance().getByText('$ 2.000')).toBeInTheDocument()
  })

  it('marca el filtro activo con la clase "on"', async () => {
    const user = userEvent.setup()
    render(<MyPurchases purchases={purchases} products={products} person={person} />)
    await user.click(filterBtn('Cash'))
    expect(filterBtn('Cash')).toHaveClass('on')
    expect(filterBtn('All')).not.toHaveClass('on')
  })
})

describe('MyPurchases — encabezado', () => {
  it('muestra el título de la vista', () => {
    render(<MyPurchases purchases={[]} products={products} person={person} />)
    expect(screen.getByText('Your Purchases')).toBeInTheDocument()
  })

  it('muestra la leyenda "You owe Marianita"', () => {
    render(<MyPurchases purchases={[]} products={products} person={person} />)
    expect(screen.getByText('You owe Marianita')).toBeInTheDocument()
  })
})

describe('MyPurchases — pagar', () => {
  const conDeuda = [
    mkPurchase('c1', 'p1', 'debt'), // Chokis 2000
    mkPurchase('c2', 'p2', 'debt'), // Doritos 2800
  ]

  it('no muestra el botón de pagar si no hay deuda', () => {
    render(<MyPurchases purchases={[mkPurchase('c1', 'p1', 'cash')]} products={products} person={person} onSettle={vi.fn()} />)
    expect(screen.queryByText('Pay what I owe')).not.toBeInTheDocument()
  })

  it('abre el modal de pago con las compras fiadas', async () => {
    const user = userEvent.setup()
    render(<MyPurchases purchases={conDeuda} products={products} person={person} onSettle={vi.fn()} />)
    await user.click(screen.getByText('Pay what I owe'))
    const modal = screen.getByText('Pay your tab').closest('.modal')
    expect(within(modal).getByText('Chokis')).toBeInTheDocument()
    expect(within(modal).getByText('Doritos')).toBeInTheDocument()
  })

  it('elegir un método pide confirmación antes de llamar a onSettle', async () => {
    const user = userEvent.setup()
    const onSettle = vi.fn().mockResolvedValue([])
    render(<MyPurchases purchases={conDeuda} products={products} person={person} onSettle={onSettle} />)
    await user.click(screen.getByText('Pay what I owe'))
    const payAll = screen.getByText(/Pay all/).closest('.pay-all')
    await user.click(within(payAll).getByRole('button', { name: 'Cash' }))
    // aún no llama: aparece la confirmación
    expect(onSettle).not.toHaveBeenCalled()
    expect(screen.getByText('Yes, pay')).toBeInTheDocument()
  })

  it('"Pagar todo" confirmado llama a onSettle con todos los ids y el método', async () => {
    const user = userEvent.setup()
    const onSettle = vi.fn().mockResolvedValue([])
    render(<MyPurchases purchases={conDeuda} products={products} person={person} onSettle={onSettle} />)
    await user.click(screen.getByText('Pay what I owe'))
    const payAll = screen.getByText(/Pay all/).closest('.pay-all')
    await user.click(within(payAll).getByRole('button', { name: 'Cash' }))
    await user.click(screen.getByText('Yes, pay'))
    expect(onSettle).toHaveBeenCalledWith(['c1', 'c2'], 'cash')
  })

  it('pagar una sola compra confirmada llama a onSettle con ese id', async () => {
    const user = userEvent.setup()
    const onSettle = vi.fn().mockResolvedValue([])
    render(<MyPurchases purchases={conDeuda} products={products} person={person} onSettle={onSettle} />)
    await user.click(screen.getByText('Pay what I owe'))
    const firstRow = document.querySelectorAll('.settle-row')[0]
    await user.click(within(firstRow).getByRole('button', { name: 'Transfer' }))
    await user.click(screen.getByText('Yes, pay'))
    expect(onSettle).toHaveBeenCalledWith(['c1'], 'transfer')
  })
})
