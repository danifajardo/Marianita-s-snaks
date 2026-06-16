import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MarianitaPanel from '../../views/MarianitaPanel'

vi.mock('lucide')
vi.mock('react-i18next')

const products = [
  { id: 'p1', name: 'Chokis',  emoji: '🍪', price: 2000, active: true  },
  { id: 'p2', name: 'Doritos', emoji: '🌽', price: 2800, active: true  },
  { id: 'p3', name: 'Menta',   emoji: '🍬', price: 1000, active: false },
]

const persons = [
  { id: 'u-1', employeeId: '001', name: 'Ana Gómez',  initial: 'A' },
  { id: 'u-2', employeeId: '002', name: 'Luis Pérez',  initial: 'L' },
]

const daysAgo = (d) => new Date(Date.now() - d * 86400000).toISOString()

const defaultPurchases = [
  { id: 'c1', personId: 'u-1', productId: 'p1', quantity: 2, method: 'cash',     date: daysAgo(0)  }, // 4000 pagado
  { id: 'c2', personId: 'u-1', productId: 'p2', quantity: 1, method: 'transfer', date: daysAgo(0)  }, // 2800 pagado
  { id: 'c3', personId: 'u-1', productId: 'p1', quantity: 2, method: 'debt',     date: daysAgo(0)  }, // 4000 debe (Ana)
  { id: 'c4', personId: 'u-2', productId: 'p1', quantity: 1, method: 'debt',     date: daysAgo(2)  }, // 2000 debe (Luis)
  { id: 'c5', personId: 'u-1', productId: 'p1', quantity: 1, method: 'debt',     date: daysAgo(40) }, // 2000 debe antiguo (Ana)
]

const defaultProps = {
  purchases: defaultPurchases,
  products,
  persons,
  onToggleProduct: vi.fn(),
  onEditPrice:     vi.fn(),
  onAddProduct:    vi.fn(),
}

// Obtiene la tarjeta del total principal (grande)
const grandTotalCard = () =>
  document.querySelector('.total-card.grande')

beforeEach(() => vi.clearAllMocks())

// ─── Totales ──────────────────────────────────────────────────────────────────

describe('MarianitaPanel — totales', () => {
  it('muestra el total de la semana por defecto', () => {
    render(<MarianitaPanel {...defaultProps} />)
    // semana (todos los métodos): c1(4000) + c2(2800) + c3(4000) + c4(2000) = 12800
    expect(within(grandTotalCard()).getByText('$ 12.800')).toBeInTheDocument()
  })

  it('muestra el total en efectivo de la semana', () => {
    render(<MarianitaPanel {...defaultProps} />)
    // cash: c1(4000)
    const cashCard = screen.getByText('Cash').closest('.total-card')
    expect(within(cashCard).getByText('$ 4.000')).toBeInTheDocument()
  })

  it('muestra el total en transferencia de la semana', () => {
    render(<MarianitaPanel {...defaultProps} />)
    // transfer: c2(2800)
    const transferCard = screen.getByText('Transfer').closest('.total-card')
    expect(within(transferCard).getByText('$ 2.800')).toBeInTheDocument()
  })

  it('muestra el total en debe (fiado) de la semana', () => {
    render(<MarianitaPanel {...defaultProps} />)
    // debt: c3(4000) + c4(2000) = 6000
    const debtCard = screen.getByText('On tab').closest('.total-card')
    expect(within(debtCard).getByText('$ 6.000')).toBeInTheDocument()
  })

  it('el filtro "All" incluye compras antiguas', async () => {
    const user = userEvent.setup()
    render(<MarianitaPanel {...defaultProps} />)
    await user.click(screen.getByText('All'))
    // all: c1(4000) + c2(2800) + c3(4000) + c4(2000) + c5(2000) = 14800
    expect(within(grandTotalCard()).getByText('$ 14.800')).toBeInTheDocument()
  })

  it('el filtro "Today" excluye compras de días anteriores', async () => {
    const user = userEvent.setup()
    render(<MarianitaPanel {...defaultProps} />)
    await user.click(screen.getByText('Today'))
    // today: c1(4000) + c2(2800) + c3(4000) = 10800; c4 tiene 2 días → excluido
    expect(within(grandTotalCard()).getByText('$ 10.800')).toBeInTheDocument()
    // Luis solo compró hace 2 días → no aparece en Today
    expect(screen.queryByText('Luis Pérez')).not.toBeInTheDocument()
  })
})

// ─── Pestaña "Quién debe" ─────────────────────────────────────────────────────

describe('MarianitaPanel — pestaña "Who owes"', () => {
  it('muestra la pestaña "Who owes" activa por defecto', () => {
    render(<MarianitaPanel {...defaultProps} />)
    expect(screen.getByText('Who owes').closest('button')).toHaveClass('on')
  })

  it('muestra las personas con deuda en la semana', () => {
    render(<MarianitaPanel {...defaultProps} />)
    expect(screen.getByText('Ana Gómez')).toBeInTheDocument()
    expect(screen.getByText('Luis Pérez')).toBeInTheDocument()
  })

  it('asigna la insignia #1 al deudor con más deuda', () => {
    render(<MarianitaPanel {...defaultProps} />)
    expect(screen.getByText('#1')).toBeInTheDocument()
  })

  it('muestra el estado vacío cuando nadie tiene deudas', () => {
    render(<MarianitaPanel {...defaultProps} purchases={[]} />)
    expect(screen.getByText('All up to date')).toBeInTheDocument()
    expect(screen.getByText('No one owes anything this period.')).toBeInTheDocument()
  })

  it('las compras pagadas (efectivo/transferencia) no cuentan como deuda', () => {
    const soloPagadas = [
      { id: 'c1', personId: 'u-1', productId: 'p1', quantity: 1, method: 'cash',     date: daysAgo(0) },
      { id: 'c2', personId: 'u-2', productId: 'p2', quantity: 1, method: 'transfer', date: daysAgo(0) },
    ]
    render(<MarianitaPanel {...defaultProps} purchases={soloPagadas} />)
    expect(screen.getByText('All up to date')).toBeInTheDocument()
    expect(screen.queryByText('Ana Gómez')).not.toBeInTheDocument()
    expect(screen.queryByText('Luis Pérez')).not.toBeInTheDocument()
  })

  it('no muestra personas cuyo total es 0 en el período seleccionado', () => {
    const soloAna = [{ id: 'c1', personId: 'u-1', productId: 'p1', quantity: 1, method: 'debt', date: daysAgo(0) }]
    render(<MarianitaPanel {...defaultProps} purchases={soloAna} />)
    expect(screen.getByText('Ana Gómez')).toBeInTheDocument()
    expect(screen.queryByText('Luis Pérez')).not.toBeInTheDocument()
  })

  it('el filtro "Today" excluye a quienes solo compraron antes de hoy', async () => {
    const user = userEvent.setup()
    render(<MarianitaPanel {...defaultProps} />)
    await user.click(screen.getByText('Today'))
    expect(screen.queryByText('Luis Pérez')).not.toBeInTheDocument()
    expect(screen.getByText('Ana Gómez')).toBeInTheDocument()
  })
})

// ─── Deuda saldada (panel solo lectura) ────────────────────────────────────────

describe('MarianitaPanel — deuda saldada', () => {
  it('una deuda ya saldada no aparece en "¿Quién debe?" y suma a su método', () => {
    const pagada = [
      { id: 'c1', personId: 'u-1', productId: 'p1', quantity: 1, method: 'debt', paidMethod: 'cash', paidDate: daysAgo(0), date: daysAgo(0) },
    ]
    render(<MarianitaPanel {...defaultProps} purchases={pagada} />)
    expect(screen.getByText('All up to date')).toBeInTheDocument()
    // la plata entró como efectivo
    const cashCard = screen.getByText('Cash').closest('.total-card')
    expect(within(cashCard).getByText('$ 2.000')).toBeInTheDocument()
  })
})

// ─── Pestaña "Productos" ──────────────────────────────────────────────────────

describe('MarianitaPanel — pestaña "Products"', () => {
  const goToProducts = async (user) => {
    await user.click(screen.getByText('Products'))
  }

  it('muestra todos los productos al cambiar a la pestaña Products', async () => {
    const user = userEvent.setup()
    render(<MarianitaPanel {...defaultProps} />)
    await goToProducts(user)
    expect(screen.getByText('Chokis')).toBeInTheDocument()
    expect(screen.getByText('Doritos')).toBeInTheDocument()
    expect(screen.getByText('Menta')).toBeInTheDocument()
  })

  it('los productos inactivos tienen la clase "off"', async () => {
    const user = userEvent.setup()
    render(<MarianitaPanel {...defaultProps} />)
    await goToProducts(user)
    expect(screen.getByText('Menta').closest('.prod-row')).toHaveClass('off')
  })

  it('el toggle llama a onToggleProduct con el id del producto', async () => {
    const user = userEvent.setup()
    const onToggleProduct = vi.fn()
    render(<MarianitaPanel {...defaultProps} onToggleProduct={onToggleProduct} />)
    await goToProducts(user)
    await user.click(screen.getAllByRole('checkbox')[0])
    expect(onToggleProduct).toHaveBeenCalledWith('p1')
  })

  it('hacer clic en el precio abre el campo de edición', async () => {
    const user = userEvent.setup()
    render(<MarianitaPanel {...defaultProps} />)
    await goToProducts(user)
    await user.click(screen.getAllByText('$ 2.000')[0])
    expect(screen.getByRole('textbox')).toBeInTheDocument()
    expect(screen.getByText('Save')).toBeInTheDocument()
  })

  it('"Save" llama a onEditPrice con el id y el precio nuevo', async () => {
    const user = userEvent.setup()
    const onEditPrice = vi.fn()
    render(<MarianitaPanel {...defaultProps} onEditPrice={onEditPrice} />)
    await goToProducts(user)
    await user.click(screen.getAllByText('$ 2.000')[0])
    const input = screen.getByRole('textbox')
    await user.clear(input)
    await user.type(input, '2500')
    await user.click(screen.getByText('Save'))
    expect(onEditPrice).toHaveBeenCalledWith('p1', 2500)
  })

  it('"Cancel" en el editor no llama a onEditPrice', async () => {
    const user = userEvent.setup()
    const onEditPrice = vi.fn()
    render(<MarianitaPanel {...defaultProps} onEditPrice={onEditPrice} />)
    await goToProducts(user)
    await user.click(screen.getAllByText('$ 2.000')[0])
    await user.click(screen.getByText('Cancel'))
    expect(onEditPrice).not.toHaveBeenCalled()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('el botón "Add product" muestra el formulario de nuevo producto', async () => {
    const user = userEvent.setup()
    render(<MarianitaPanel {...defaultProps} />)
    await goToProducts(user)
    await user.click(screen.getByText('Add product'))
    expect(screen.getByPlaceholderText('Product name')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Price')).toBeInTheDocument()
  })

  it('añadir un producto válido llama a onAddProduct y cierra el formulario', async () => {
    const user = userEvent.setup()
    const onAddProduct = vi.fn()
    render(<MarianitaPanel {...defaultProps} onAddProduct={onAddProduct} />)
    await goToProducts(user)
    await user.click(screen.getByText('Add product'))
    await user.type(screen.getByPlaceholderText('Product name'), 'Nucita')
    await user.type(screen.getByPlaceholderText('Price'), '1500')
    await user.click(screen.getByText('Add'))
    expect(onAddProduct).toHaveBeenCalledWith({ name: 'Nucita', price: 1500 })
    expect(screen.queryByPlaceholderText('Product name')).not.toBeInTheDocument()
  })

  it('"Cancel" en el formulario cierra sin añadir producto', async () => {
    const user = userEvent.setup()
    const onAddProduct = vi.fn()
    render(<MarianitaPanel {...defaultProps} onAddProduct={onAddProduct} />)
    await goToProducts(user)
    await user.click(screen.getByText('Add product'))
    await user.click(screen.getByText('Cancel'))
    expect(onAddProduct).not.toHaveBeenCalled()
    expect(screen.queryByPlaceholderText('Product name')).not.toBeInTheDocument()
  })
})
