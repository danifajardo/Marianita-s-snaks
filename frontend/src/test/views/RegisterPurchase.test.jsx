import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RegisterPurchase from '../../views/RegisterPurchase'

vi.mock('lucide')
vi.mock('react-i18next')

const products = [
  { id: 'p1', name: 'Chokis',   emoji: '🍪', price: 2000, active: true  },
  { id: 'p2', name: 'Doritos',  emoji: '🌽', price: 2800, active: true  },
  { id: 'p3', name: 'Secreto',  emoji: '🍬', price: 1000, active: false },
]

const person = { id: 'u-1', employeeId: '001', name: 'María López', initial: 'M' }

const defaultProps = { products, person, onConfirm: vi.fn() }

beforeEach(() => vi.clearAllMocks())

// ─── Pantalla inicial ──────────────────────────────────────────────────────────

describe('RegisterPurchase — pantalla inicial', () => {
  it('muestra el saludo con el primer nombre de la persona', () => {
    render(<RegisterPurchase {...defaultProps} />)
    expect(screen.getByText(/María/)).toBeInTheDocument()
  })

  it('muestra solo los productos activos', () => {
    render(<RegisterPurchase {...defaultProps} />)
    expect(screen.getByText('Chokis')).toBeInTheDocument()
    expect(screen.getByText('Doritos')).toBeInTheDocument()
    expect(screen.queryByText('Secreto')).not.toBeInTheDocument()
  })

  it('muestra el precio de cada producto', () => {
    render(<RegisterPurchase {...defaultProps} />)
    expect(screen.getByText('$ 2.000')).toBeInTheDocument()
    expect(screen.getByText('$ 2.800')).toBeInTheDocument()
  })

  it('no muestra la barra de checkout cuando el carrito está vacío', () => {
    render(<RegisterPurchase {...defaultProps} />)
    expect(screen.queryByText('Record purchase')).not.toBeInTheDocument()
  })
})

// ─── Carrito ───────────────────────────────────────────────────────────────────

describe('RegisterPurchase — interacción con el carrito', () => {
  it('muestra el contador al seleccionar un producto', async () => {
    const user = userEvent.setup()
    render(<RegisterPurchase {...defaultProps} />)
    await user.click(screen.getByText('Chokis').closest('button'))
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('incrementa la cantidad al hacer clic varias veces en el mismo producto', async () => {
    const user = userEvent.setup()
    render(<RegisterPurchase {...defaultProps} />)
    const card = screen.getByText('Chokis').closest('button')
    await user.click(card)
    await user.click(card)
    await user.click(card)
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('muestra la barra de checkout cuando hay productos en el carrito', async () => {
    const user = userEvent.setup()
    render(<RegisterPurchase {...defaultProps} />)
    await user.click(screen.getByText('Chokis').closest('button'))
    expect(screen.getByText('Record purchase')).toBeInTheDocument()
  })

  it('decrementa la cantidad al hacer clic en el botón "−"', async () => {
    const user = userEvent.setup()
    render(<RegisterPurchase {...defaultProps} />)
    const card = screen.getByText('Chokis').closest('button')
    await user.click(card)
    await user.click(card)
    await user.click(screen.getByText('−'))
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('elimina el producto del carrito cuando la cantidad llega a cero', async () => {
    const user = userEvent.setup()
    render(<RegisterPurchase {...defaultProps} />)
    await user.click(screen.getByText('Chokis').closest('button'))
    await user.click(screen.getByText('−'))
    expect(screen.queryByText('Record purchase')).not.toBeInTheDocument()
  })
})

// ─── Búsqueda ──────────────────────────────────────────────────────────────────

describe('RegisterPurchase — búsqueda', () => {
  it('filtra los productos según el texto de búsqueda', async () => {
    const user = userEvent.setup()
    render(<RegisterPurchase {...defaultProps} />)
    await user.type(screen.getByPlaceholderText('Search products…'), 'chok')
    expect(screen.getByText('Chokis')).toBeInTheDocument()
    expect(screen.queryByText('Doritos')).not.toBeInTheDocument()
  })

  it('muestra el estado vacío cuando no hay resultados', async () => {
    const user = userEvent.setup()
    render(<RegisterPurchase {...defaultProps} />)
    await user.type(screen.getByPlaceholderText('Search products…'), 'xyz')
    expect(screen.getByText('No results')).toBeInTheDocument()
  })

  it('limpiar la búsqueda restaura todos los productos', async () => {
    const user = userEvent.setup()
    render(<RegisterPurchase {...defaultProps} />)
    const input = screen.getByPlaceholderText('Search products…')
    await user.type(input, 'chok')
    await user.clear(input)
    expect(screen.getByText('Doritos')).toBeInTheDocument()
  })
})

// ─── Método de pago ────────────────────────────────────────────────────────────

describe('RegisterPurchase — método de pago', () => {
  const addProduct = async (user) => {
    await user.click(screen.getByText('Chokis').closest('button'))
  }

  it('el método por defecto es "Cash"', async () => {
    const user = userEvent.setup()
    render(<RegisterPurchase {...defaultProps} />)
    await addProduct(user)
    expect(screen.getByRole('button', { name: /Cash/ })).toHaveClass('on')
  })

  it('puede cambiar al método "Transfer"', async () => {
    const user = userEvent.setup()
    render(<RegisterPurchase {...defaultProps} />)
    await addProduct(user)
    await user.click(screen.getByRole('button', { name: /Transfer/ }))
    expect(screen.getByRole('button', { name: /Transfer/ })).toHaveClass('on')
    expect(screen.getByRole('button', { name: /Cash/ })).not.toHaveClass('on')
  })
})

// ─── Modal de confirmación ─────────────────────────────────────────────────────

describe('RegisterPurchase — modal de confirmación', () => {
  const openModal = async (user) => {
    await user.click(screen.getByText('Chokis').closest('button'))
    await user.click(screen.getByText('Record purchase'))
  }

  it('abre el modal al hacer clic en "Record purchase"', async () => {
    const user = userEvent.setup()
    render(<RegisterPurchase {...defaultProps} />)
    await openModal(user)
    expect(screen.getByRole('heading', { name: 'Confirm purchase' })).toBeInTheDocument()
  })

  it('el modal muestra los productos del carrito', async () => {
    const user = userEvent.setup()
    render(<RegisterPurchase {...defaultProps} />)
    await user.click(screen.getByText('Chokis').closest('button'))
    await user.click(screen.getByText('Doritos').closest('button'))
    await user.click(screen.getByText('Record purchase'))
    const modal = screen.getByRole('heading', { name: 'Confirm purchase' }).closest('.modal')
    expect(within(modal).getByText('Chokis')).toBeInTheDocument()
    expect(within(modal).getByText('Doritos')).toBeInTheDocument()
  })

  it('cerrar el modal con "Review" oculta el modal', async () => {
    const user = userEvent.setup()
    render(<RegisterPurchase {...defaultProps} />)
    await openModal(user)
    await user.click(screen.getByText('Review'))
    expect(screen.queryByRole('heading', { name: 'Confirm purchase' })).not.toBeInTheDocument()
  })

  it('confirmar llama a onConfirm con el personId, método e items correctos', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(<RegisterPurchase {...defaultProps} onConfirm={onConfirm} />)
    await openModal(user)
    await user.click(screen.getByRole('button', { name: 'Confirm purchase' }))
    expect(onConfirm).toHaveBeenCalledOnce()
    const [args] = onConfirm.mock.calls
    expect(args[0].personId).toBe('u-1')
    expect(args[0].method).toBe('cash')
    expect(args[0].items).toEqual([{ productId: 'p1', quantity: 1 }])
  })
})

// ─── Pantalla de éxito ─────────────────────────────────────────────────────────

describe('RegisterPurchase — pantalla de éxito', () => {
  const confirmPurchase = async (user) => {
    await user.click(screen.getByText('Chokis').closest('button'))
    await user.click(screen.getByText('Record purchase'))
    await user.click(screen.getByRole('button', { name: 'Confirm purchase' }))
  }

  it('muestra la pantalla de confirmación tras confirmar la compra', async () => {
    const user = userEvent.setup()
    render(<RegisterPurchase {...defaultProps} />)
    await confirmPurchase(user)
    expect(screen.getByText('Done!')).toBeInTheDocument()
  })

  it('incluye el primer nombre de la persona en el mensaje de éxito', async () => {
    const user = userEvent.setup()
    render(<RegisterPurchase {...defaultProps} />)
    await confirmPurchase(user)
    expect(screen.getByText(/María/)).toBeInTheDocument()
  })

  it('regresa a la grilla de productos automáticamente después de 2400 ms', async () => {
    vi.useFakeTimers()
    render(<RegisterPurchase {...defaultProps} />)
    // fireEvent evita conflictos con los timers internos de userEvent
    fireEvent.click(screen.getByText('Chokis').closest('button'))
    fireEvent.click(screen.getByText('Record purchase'))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm purchase' }))
    expect(screen.getByText('Done!')).toBeInTheDocument()
    await act(async () => { vi.advanceTimersByTime(2500) })
    expect(screen.queryByText('Done!')).not.toBeInTheDocument()
    expect(screen.getByText('Chokis')).toBeInTheDocument()
    vi.useRealTimers()
  })
})
