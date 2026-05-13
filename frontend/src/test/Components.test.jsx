import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Header, BottomNav, MetodoBadge, PersonPicker, PinGate } from '../Components'

vi.mock('lucide')
vi.mock('react-i18next')

// ─── Header ───────────────────────────────────────────────────────────────────

describe('Header', () => {
  it('muestra el nombre de la marca', () => {
    render(<Header title="Título" person={null} onChangeUser={vi.fn()} />)
    expect(screen.getByText('Snacks Marianita')).toBeInTheDocument()
  })

  it('muestra el título como subtítulo', () => {
    render(<Header title="Anotar lo de hoy" person={null} onChangeUser={vi.fn()} />)
    expect(screen.getByText('Anotar lo de hoy')).toBeInTheDocument()
  })

  it('muestra el botón de usuario con el ID del empleado cuando hay persona', () => {
    const person = { id: 'u-1', employeeId: '99', name: 'Ana', initial: 'A' }
    render(<Header title="T" person={person} onChangeUser={vi.fn()} />)
    expect(screen.getByText('#99')).toBeInTheDocument()
    expect(screen.getByText('A')).toBeInTheDocument()
  })

  it('no muestra botón de usuario cuando person es null', () => {
    render(<Header title="T" person={null} onChangeUser={vi.fn()} />)
    expect(screen.queryByText('#')).not.toBeInTheDocument()
  })

  it('llama a onChangeUser al hacer clic en el botón de usuario', async () => {
    const user = userEvent.setup()
    const onChangeUser = vi.fn()
    const person = { id: 'u-1', employeeId: '99', name: 'Ana', initial: 'A' }
    render(<Header title="T" person={person} onChangeUser={onChangeUser} />)
    await user.click(screen.getByText('#99').closest('button'))
    expect(onChangeUser).toHaveBeenCalledOnce()
  })

  it('muestra los tres botones de idioma', () => {
    render(<Header title="T" person={null} onChangeUser={vi.fn()} />)
    expect(screen.getByText('EN')).toBeInTheDocument()
    expect(screen.getByText('ES')).toBeInTheDocument()
    expect(screen.getByText('한')).toBeInTheDocument()
  })
})

// ─── BottomNav ────────────────────────────────────────────────────────────────

describe('BottomNav', () => {
  it('muestra las tres pestañas de navegación', () => {
    render(<BottomNav view="register" setView={vi.fn()} />)
    expect(screen.getByText('Register')).toBeInTheDocument()
    expect(screen.getByText('My Purchases')).toBeInTheDocument()
    expect(screen.getByText('Marianita')).toBeInTheDocument()
  })

  it('marca la pestaña activa con la clase "active"', () => {
    render(<BottomNav view="myPurchases" setView={vi.fn()} />)
    const activeBtn = screen.getByText('My Purchases').closest('button')
    expect(activeBtn).toHaveClass('active')
    expect(screen.getByText('Register').closest('button')).not.toHaveClass('active')
  })

  it('llama a setView con el id correcto al hacer clic', async () => {
    const user = userEvent.setup()
    const setView = vi.fn()
    render(<BottomNav view="register" setView={setView} />)
    await user.click(screen.getByText('My Purchases'))
    expect(setView).toHaveBeenCalledWith('myPurchases')
  })
})

// ─── MetodoBadge ──────────────────────────────────────────────────────────────

describe('MetodoBadge', () => {
  it('muestra "Cash" cuando el método es cash', () => {
    render(<MetodoBadge method="cash" />)
    expect(screen.getByText('Cash')).toBeInTheDocument()
  })

  it('muestra "Transfer" cuando el método es transfer', () => {
    render(<MetodoBadge method="transfer" />)
    expect(screen.getByText('Transfer')).toBeInTheDocument()
  })

  it('aplica la clase correcta según el método', () => {
    const { container } = render(<MetodoBadge method="cash" />)
    expect(container.firstChild).toHaveClass('method-cash')
  })
})

// ─── PersonPicker ─────────────────────────────────────────────────────────────

describe('PersonPicker', () => {
  const defaultProps = {
    persons: [],
    value: null,
    onChange: vi.fn(),
    onClose: vi.fn(),
    onRegister: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('muestra el mensaje de "nadie registrado" cuando la lista está vacía', () => {
    render(<PersonPicker {...defaultProps} />)
    expect(screen.getByText('No one registered yet.')).toBeInTheDocument()
  })

  it('muestra las personas registradas', () => {
    const persons = [
      { id: 'u-1', employeeId: '001', name: 'Ana García', initial: 'A' },
      { id: 'u-2', employeeId: '002', name: 'Luis Pérez', initial: 'L' },
    ]
    render(<PersonPicker {...defaultProps} persons={persons} />)
    expect(screen.getByText('#001')).toBeInTheDocument()
    expect(screen.getByText('#002')).toBeInTheDocument()
  })

  it('marca como seleccionada la persona activa', () => {
    const persons = [{ id: 'u-1', employeeId: '001', name: 'Ana', initial: 'A' }]
    render(<PersonPicker {...defaultProps} persons={persons} value="u-1" />)
    expect(screen.getByText('#001').closest('button')).toHaveClass('sel')
  })

  it('llama a onChange y onClose al seleccionar una persona', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const onClose = vi.fn()
    const persons = [{ id: 'u-1', employeeId: '001', name: 'Ana', initial: 'A' }]
    render(<PersonPicker {...defaultProps} persons={persons} onChange={onChange} onClose={onClose} />)
    await user.click(screen.getByText('#001'))
    expect(onChange).toHaveBeenCalledWith('u-1')
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('muestra el formulario de registro al hacer clic en "I\'m new"', async () => {
    const user = userEvent.setup()
    render(<PersonPicker {...defaultProps} />)
    await user.click(screen.getByText("I'm new, sign me up"))
    expect(screen.getByText('Employee number')).toBeInTheDocument()
    expect(screen.getByText('Your name')).toBeInTheDocument()
    expect(screen.getByText('Phone')).toBeInTheDocument()
  })

  it('muestra error si se intenta registrar sin número de empleado', async () => {
    const user = userEvent.setup()
    render(<PersonPicker {...defaultProps} />)
    await user.click(screen.getByText("I'm new, sign me up"))
    await user.click(screen.getByText('Register me'))
    expect(screen.getByText('Enter your employee number')).toBeInTheDocument()
  })

  it('muestra error si se intenta registrar sin nombre', async () => {
    const user = userEvent.setup()
    render(<PersonPicker {...defaultProps} />)
    await user.click(screen.getByText("I'm new, sign me up"))
    await user.type(screen.getByPlaceholderText('e.g. 31000376'), '001')
    await user.click(screen.getByText('Register me'))
    expect(screen.getByText('Enter your name')).toBeInTheDocument()
  })

  it('muestra error si el teléfono tiene menos de 10 dígitos', async () => {
    const user = userEvent.setup()
    render(<PersonPicker {...defaultProps} />)
    await user.click(screen.getByText("I'm new, sign me up"))
    await user.type(screen.getByPlaceholderText('e.g. 31000376'), '001')
    await user.type(screen.getByPlaceholderText('e.g. Maria Lopez'), 'Ana García')
    await user.type(screen.getByPlaceholderText('e.g. 3001234567'), '12345')
    await user.click(screen.getByText('Register me'))
    expect(screen.getByText('Enter a valid phone number (10 digits)')).toBeInTheDocument()
  })

  it('muestra error si el ID de empleado ya está registrado', async () => {
    const user = userEvent.setup()
    const persons = [{ id: 'u-1', employeeId: '001', name: 'Ana', initial: 'A' }]
    render(<PersonPicker {...defaultProps} persons={persons} />)
    await user.click(screen.getByText("I'm new, sign me up"))
    await user.type(screen.getByPlaceholderText('e.g. 31000376'), '001')
    await user.type(screen.getByPlaceholderText('e.g. Maria Lopez'), 'Otro')
    await user.type(screen.getByPlaceholderText('e.g. 3001234567'), '3001234567')
    await user.click(screen.getByText('Register me'))
    expect(screen.getByText('That ID is already registered')).toBeInTheDocument()
  })

  it('llama a onRegister y onClose con datos válidos', async () => {
    const user = userEvent.setup()
    const onRegister = vi.fn()
    const onClose = vi.fn()
    render(<PersonPicker {...defaultProps} onRegister={onRegister} onClose={onClose} />)
    await user.click(screen.getByText("I'm new, sign me up"))
    await user.type(screen.getByPlaceholderText('e.g. 31000376'), '007')
    await user.type(screen.getByPlaceholderText('e.g. Maria Lopez'), 'Carlos Ruiz')
    await user.type(screen.getByPlaceholderText('e.g. 3001234567'), '3001234567')
    await user.click(screen.getByText('Register me'))
    expect(onRegister).toHaveBeenCalledWith({
      employeeId: '007',
      name: 'Carlos Ruiz',
      phone: '3001234567',
    })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('el botón "← Back" regresa a la lista de personas', async () => {
    const user = userEvent.setup()
    render(<PersonPicker {...defaultProps} />)
    await user.click(screen.getByText("I'm new, sign me up"))
    await user.click(screen.getByText('← Back'))
    expect(screen.getByText('No one registered yet.')).toBeInTheDocument()
  })
})

// ─── PinGate ──────────────────────────────────────────────────────────────────

describe('PinGate', () => {
  it('muestra el campo de PIN y el botón de entrar', () => {
    render(<PinGate onSuccess={vi.fn()} />)
    expect(screen.getByPlaceholderText('• • • •')).toBeInTheDocument()
    expect(screen.getByText('Enter')).toBeInTheDocument()
  })

  it('llama a onSuccess cuando se ingresa el PIN correcto', async () => {
    const user = userEvent.setup()
    const onSuccess = vi.fn()
    render(<PinGate onSuccess={onSuccess} />)
    await user.type(screen.getByPlaceholderText('• • • •'), '1234')
    await user.click(screen.getByText('Enter'))
    expect(onSuccess).toHaveBeenCalledOnce()
  })

  it('no llama a onSuccess con PIN incorrecto', async () => {
    const user = userEvent.setup()
    const onSuccess = vi.fn()
    render(<PinGate onSuccess={onSuccess} />)
    await user.type(screen.getByPlaceholderText('• • • •'), '0000')
    await user.click(screen.getByText('Enter'))
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('muestra el mensaje de error con PIN incorrecto', async () => {
    const user = userEvent.setup()
    render(<PinGate onSuccess={vi.fn()} />)
    await user.type(screen.getByPlaceholderText('• • • •'), '0000')
    await user.click(screen.getByText('Enter'))
    expect(screen.getByText('Incorrect PIN, try again')).toBeInTheDocument()
  })

  it('limpia el campo de PIN tras un intento fallido', async () => {
    const user = userEvent.setup()
    render(<PinGate onSuccess={vi.fn()} />)
    await user.type(screen.getByPlaceholderText('• • • •'), '9999')
    await user.click(screen.getByText('Enter'))
    expect(screen.getByPlaceholderText('• • • •')).toHaveValue('')
  })

  it('también verifica el PIN al presionar Enter en el teclado', async () => {
    const user = userEvent.setup()
    const onSuccess = vi.fn()
    render(<PinGate onSuccess={onSuccess} />)
    await user.type(screen.getByPlaceholderText('• • • •'), '1234{Enter}')
    expect(onSuccess).toHaveBeenCalledOnce()
  })
})
