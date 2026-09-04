import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MarianitaPanel from '../../views/MarianitaPanel'

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
  onEditStock:     vi.fn(),
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

// ─── Pestaña "Ventas" ───────────────────────────────────────────────────────

describe('MarianitaPanel — ventas por día', () => {
  it('muestra el total vendido agrupado por día', async () => {
    const user = userEvent.setup()
    render(<MarianitaPanel {...defaultProps} />)
    await user.click(screen.getByText('Sales'))
    // hoy: c1(4000) + c2(2800) + c3(4000) = 10800 ; hace 2 días: c4(2000)
    const tabla = document.querySelector('.deudas-table')
    expect(within(tabla).getByText('$ 10.800')).toBeInTheDocument()
    expect(within(tabla).getByText('$ 2.000')).toBeInTheDocument()
  })

  it('respeta el filtro de período en las ventas por día', async () => {
    const user = userEvent.setup()
    render(<MarianitaPanel {...defaultProps} />)
    await user.click(screen.getByText('Today'))
    await user.click(screen.getByText('Sales'))
    // solo hoy: 10800; el día de hace 2 días (2000) ya no aparece
    const tabla = document.querySelector('.deudas-table')
    expect(within(tabla).getByText('$ 10.800')).toBeInTheDocument()
    expect(within(tabla).queryByText('$ 2.000')).not.toBeInTheDocument()
  })

  it('al expandir un día muestra el detalle de las compras', async () => {
    const user = userEvent.setup()
    render(<MarianitaPanel {...defaultProps} />)
    await user.click(screen.getByText('Sales'))
    // el detalle aún no se ve
    expect(screen.queryByText('Doritos')).not.toBeInTheDocument()
    // expandir "hoy" (Today) muestra los productos vendidos ese día
    await user.click(screen.getByText('Today', { selector: '.persona-name' }))
    const detail = document.querySelector('.day-detail')
    expect(within(detail).getByText('Doritos')).toBeInTheDocument()
    // c1 y c3 son Chokis ese día
    expect(within(detail).getAllByText('Chokis').length).toBe(2)
  })
})

// ─── Pestaña "Solicitudes" ──────────────────────────────────────────────────

describe('MarianitaPanel — usuarios', () => {
  const pending = [
    { id: 'u-9', employeeId: '009', name: 'Nuevo Juan', phone: '3001112233', initial: 'N', status: 'pending' },
  ]

  it('lista los pendientes y aprobar/rechazar llama al handler con el id', async () => {
    const user = userEvent.setup()
    const onApprovePerson = vi.fn()
    const onRejectPerson = vi.fn()
    render(<MarianitaPanel {...defaultProps} pendingPersons={pending} onApprovePerson={onApprovePerson} onRejectPerson={onRejectPerson} />)
    await user.click(screen.getByText('Users'))
    expect(screen.getByText('Nuevo Juan')).toBeInTheDocument()
    await user.click(screen.getByText('Approve'))
    expect(onApprovePerson).toHaveBeenCalledWith('u-9')
    await user.click(screen.getByText('Reject'))
    expect(onRejectPerson).toHaveBeenCalledWith('u-9')
  })

  it('resetear el PIN de un usuario activo llama a onResetPin', async () => {
    const user = userEvent.setup()
    const onResetPin = vi.fn()
    const activos = [
      { id: 'u-1', employeeId: '001', name: 'Ana Gómez', initial: 'A', status: 'active', hasPin: true },
      { id: 'u-2', employeeId: '002', name: 'Luis Pérez', initial: 'L', status: 'active', hasPin: true },
    ]
    render(<MarianitaPanel {...defaultProps} persons={activos} onResetPin={onResetPin} />)
    await user.click(screen.getByText('Users'))
    await user.click(screen.getAllByText('Reset PIN')[0])
    expect(onResetPin).toHaveBeenCalledWith('u-1')
  })

  it('desactivar un usuario activo llama a onDeactivatePerson', async () => {
    const user = userEvent.setup()
    const onDeactivatePerson = vi.fn()
    const activos = [{ id: 'u-1', employeeId: '001', name: 'Ana Gómez', initial: 'A', status: 'active', hasPin: true }]
    render(<MarianitaPanel {...defaultProps} persons={activos} onDeactivatePerson={onDeactivatePerson} />)
    await user.click(screen.getByText('Users'))
    await user.click(screen.getByText('Deactivate'))
    expect(onDeactivatePerson).toHaveBeenCalledWith('u-1')
  })

  it('reactivar un usuario inactivo llama a onReactivatePerson', async () => {
    const user = userEvent.setup()
    const onReactivatePerson = vi.fn()
    const inactivos = [{ id: 'u-3', employeeId: '003', name: 'Pedro Inactivo', initial: 'P', status: 'inactive', hasPin: true }]
    render(<MarianitaPanel {...defaultProps} inactivePersons={inactivos} onReactivatePerson={onReactivatePerson} />)
    await user.click(screen.getByText('Users'))
    expect(screen.getByText('Pedro Inactivo')).toBeInTheDocument()
    await user.click(screen.getByText('Reactivate'))
    expect(onReactivatePerson).toHaveBeenCalledWith('u-3')
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
    expect(onAddProduct).toHaveBeenCalledWith({ name: 'Nucita', price: 1500, stock: 0 })
    expect(screen.queryByPlaceholderText('Product name')).not.toBeInTheDocument()
  })

  it('editar el stock llama a onEditStock con el id y el valor', async () => {
    const user = userEvent.setup()
    const onEditStock = vi.fn()
    render(<MarianitaPanel {...defaultProps} onEditStock={onEditStock} />)
    await goToProducts(user)
    await user.click(screen.getAllByText('Stock: 0')[0])
    const input = screen.getByRole('textbox')
    await user.clear(input)
    await user.type(input, '12')
    await user.click(screen.getByText('Save'))
    expect(onEditStock).toHaveBeenCalledWith('p1', 12)
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
