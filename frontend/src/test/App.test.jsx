import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import * as api from '../api'

vi.mock('react-i18next')
vi.mock('../api')

const person = { id: 'u-1', employeeId: '001', name: 'Ana García', initial: 'A', status: 'active' }

// Una sesión válida necesita id + fecha de expiración + token: sin token, api.js
// no puede autenticar ninguna llamada y App vuelve a pedir identificarse.
const seedApi = (persons = [person]) => {
  vi.mocked(api.getPersonas).mockResolvedValue(persons)
  vi.mocked(api.getUserToken).mockReturnValue('token-de-prueba')
  localStorage.setItem('dulceria.personId', 'u-1')
  localStorage.setItem('dulceria.sessionExp', String(Date.now() + 3600000))
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  vi.mocked(api.getPersonas).mockResolvedValue([])
  vi.mocked(api.getProductos).mockResolvedValue([])
  vi.mocked(api.getCompras).mockResolvedValue([])
  vi.mocked(api.postPersona).mockImplementation(({ employeeId, name, phone }) =>
    Promise.resolve({ id: 'u-' + employeeId, employeeId, name, phone, initial: name.charAt(0).toUpperCase(), status: 'pending' })
  )
  vi.mocked(api.getUserToken).mockReturnValue(null)
  vi.mocked(api.loginUser).mockResolvedValue(null)
  vi.mocked(api.setUserPin).mockResolvedValue(person)
  vi.mocked(api.postCompra).mockResolvedValue([])
  vi.mocked(api.patchProducto).mockResolvedValue({})
  vi.mocked(api.postProducto).mockResolvedValue({})
})

describe('App — selección inicial de persona', () => {
  it('muestra el PersonPicker cuando no hay persona guardada', async () => {
    render(<App />)
    await waitFor(() => expect(screen.getByText('Who are you?')).toBeInTheDocument())
  })

  it('muestra el PersonPicker cuando el ID guardado no existe en la lista', async () => {
    vi.mocked(api.getPersonas).mockResolvedValue([])
    vi.mocked(api.getUserToken).mockReturnValue('token-de-prueba')
    localStorage.setItem('dulceria.personId', 'u-inexistente')
    localStorage.setItem('dulceria.sessionExp', String(Date.now() + 3600000))
    render(<App />)
    await waitFor(() => expect(screen.getByText('Who are you?')).toBeInTheDocument())
  })

  it('no muestra el PersonPicker cuando ya hay una persona válida guardada', async () => {
    seedApi()
    render(<App />)
    await waitFor(() => expect(screen.queryByText('Who are you?')).not.toBeInTheDocument())
  })

  it('si la sesión expiró, pide identificarse de nuevo', async () => {
    vi.mocked(api.getPersonas).mockResolvedValue([person])
    vi.mocked(api.getUserToken).mockReturnValue('token-de-prueba')
    localStorage.setItem('dulceria.personId', 'u-1')
    localStorage.setItem('dulceria.sessionExp', String(Date.now() - 1000)) // ya vencida
    render(<App />)
    await waitFor(() => expect(screen.getByText('Who are you?')).toBeInTheDocument())
  })

  it('cierra la sesión si al usuario logueado le resetearon el PIN', async () => {
    vi.mocked(api.getPersonas).mockResolvedValue([{ ...person, hasPin: false }])
    localStorage.setItem('dulceria.personId', 'u-1')
    localStorage.setItem('dulceria.sessionExp', String(Date.now() + 3600000))
    render(<App />)
    await waitFor(() => expect(screen.getByText('Who are you?')).toBeInTheDocument())
  })
})

describe('App — registro de nueva persona', () => {
  it('registrar pasa por confirmación y deja al usuario pendiente de aprobación', async () => {
    const user = userEvent.setup()
    render(<App />)
    await waitFor(() => screen.getByText("I'm new, sign me up"))
    await user.click(screen.getByText("I'm new, sign me up"))
    await user.type(screen.getByPlaceholderText('e.g. 31000376'), '007')
    await user.type(screen.getByPlaceholderText('e.g. Maria Lopez'), 'James Bond')
    await user.type(screen.getByPlaceholderText('e.g. 3001234567'), '3001234567')
    await user.type(screen.getByPlaceholderText('4 digits'), '1234')
    await user.type(screen.getByPlaceholderText('The same 4 digits'), '1234')
    // paso 1: revisión de datos
    await user.click(screen.getByText('Register me'))
    expect(screen.getByText('Is your info correct?')).toBeInTheDocument()
    // paso 2: confirmar → crea pendiente
    await user.click(screen.getByText('Yes, sign me up'))
    // queda pendiente de aprobación (no entra a la app)
    await waitFor(() => expect(screen.getByText('Pending approval')).toBeInTheDocument())
  })
})

describe('App — navegación', () => {
  beforeEach(() => seedApi())

  it('muestra la vista Register por defecto', async () => {
    render(<App />)
    await waitFor(() => expect(screen.getByText('Register').closest('button')).toHaveClass('active'))
  })

  it('navegar a "My Purchases" cambia la vista', async () => {
    const user = userEvent.setup()
    render(<App />)
    await waitFor(() => screen.getByText('My Purchases'))
    await user.click(screen.getByText('My Purchases'))
    expect(screen.getByText('Your Purchases')).toBeInTheDocument()
  })

  it('navegar a "Marianita" muestra la pantalla de PIN', async () => {
    const user = userEvent.setup()
    render(<App />)
    await waitFor(() => screen.getByText('Marianita'))
    await user.click(screen.getByText('Marianita'))
    expect(screen.getByPlaceholderText('4 digits')).toBeInTheDocument()
  })

  it('ingresar el PIN correcto en la pestaña Marianita muestra el panel', async () => {
    const user = userEvent.setup()
    render(<App />)
    await waitFor(() => screen.getByText('Marianita'))
    await user.click(screen.getByText('Marianita'))
    await user.type(screen.getByPlaceholderText('4 digits'), '1234')
    await user.click(screen.getByText('Enter'))
    expect(screen.getByText("Marianita's Panel")).toBeInTheDocument()
  })

  it('volver a otra pestaña tras desbloquear Marianita cierra el panel', async () => {
    const user = userEvent.setup()
    render(<App />)
    await waitFor(() => screen.getByText('Marianita'))
    await user.click(screen.getByText('Marianita'))
    await user.type(screen.getByPlaceholderText('4 digits'), '1234')
    await user.click(screen.getByText('Enter'))
    await user.click(screen.getByText('Register'))
    await user.click(screen.getByText('Marianita'))
    expect(screen.getByPlaceholderText('4 digits')).toBeInTheDocument()
  })
})

describe('App — cambio de usuario', () => {
  beforeEach(() => seedApi())

  it('el botón de usuario en el header abre el PersonPicker', async () => {
    const user = userEvent.setup()
    render(<App />)
    await waitFor(() => screen.getByText('#001'))
    await user.click(screen.getByText('#001').closest('button'))
    expect(screen.getByText('Who are you?')).toBeInTheDocument()
  })
})

describe('App — persistencia en localStorage', () => {
  it('guarda el ID de la persona seleccionada en localStorage', async () => {
    const user = userEvent.setup()
    render(<App />)
    await waitFor(() => screen.getByText("I'm new, sign me up"))
    await user.click(screen.getByText("I'm new, sign me up"))
    await user.type(screen.getByPlaceholderText('e.g. 31000376'), '042')
    await user.type(screen.getByPlaceholderText('e.g. Maria Lopez'), 'Carla')
    await user.type(screen.getByPlaceholderText('e.g. 3001234567'), '3009876543')
    await user.type(screen.getByPlaceholderText('4 digits'), '1234')
    await user.type(screen.getByPlaceholderText('The same 4 digits'), '1234')
    await user.click(screen.getByText('Register me'))
    await user.click(screen.getByText('Yes, sign me up'))
    await waitFor(() => expect(localStorage.getItem('dulceria.personId')).toBeTruthy())
  })
})

describe('App — sesión basada en token', () => {
  it('no restaura la sesión si falta el token, aunque el id siga en localStorage', async () => {
    vi.mocked(api.getPersonas).mockResolvedValue([person])
    vi.mocked(api.getUserToken).mockReturnValue(null)
    localStorage.setItem('dulceria.personId', 'u-1')
    localStorage.setItem('dulceria.sessionExp', String(Date.now() + 3600000))
    render(<App />)
    await waitFor(() => expect(screen.getByText('Who are you?')).toBeInTheDocument())
  })

  it('no pide las compras cuando no hay sesión', async () => {
    render(<App />)
    await waitFor(() => screen.getByText('Who are you?'))
    expect(api.getCompras).not.toHaveBeenCalled()
  })

  it('pide las compras propias cuando sí hay sesión', async () => {
    seedApi()
    render(<App />)
    await waitFor(() => expect(api.getCompras).toHaveBeenCalled())
    // Sin argumentos: el backend devuelve solo las del dueño del token.
    expect(api.getCompras).toHaveBeenCalledWith()
  })

  it('cierra la sesión si la persona dejó de estar activa', async () => {
    seedApi([{ ...person, status: 'inactive' }])
    render(<App />)
    await waitFor(() => expect(screen.getByText('Who are you?')).toBeInTheDocument())
    expect(api.logoutUser).toHaveBeenCalled()
    expect(localStorage.getItem('dulceria.personId')).toBeNull()
  })

  it('al desbloquear el panel recarga personas y compras con permisos de admin', async () => {
    const user = userEvent.setup()
    seedApi()
    vi.mocked(api.verificarPin).mockResolvedValue(true)
    render(<App />)
    await waitFor(() => screen.getByText('Marianita'))
    await user.click(screen.getByText('Marianita'))
    await user.type(screen.getByPlaceholderText('4 digits'), '1234')
    await user.click(screen.getByText('Enter'))
    await waitFor(() => expect(api.getPersonas).toHaveBeenCalledWith({ admin: true }))
    expect(api.getCompras).toHaveBeenCalledWith(null, { admin: true })
  })
})
