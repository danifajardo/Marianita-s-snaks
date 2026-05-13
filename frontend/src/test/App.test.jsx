import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'

vi.mock('lucide')
vi.mock('react-i18next')

const person = { id: 'u-1', employeeId: '001', name: 'Ana García', initial: 'A' }

const seedStorage = () => {
  localStorage.setItem('dulceria.persons',  JSON.stringify([person]))
  localStorage.setItem('dulceria.personId', 'u-1')
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
})

describe('App — selección inicial de persona', () => {
  it('muestra el PersonPicker cuando no hay persona guardada', () => {
    render(<App />)
    expect(screen.getByText('Who are you?')).toBeInTheDocument()
  })

  it('muestra el PersonPicker cuando el ID guardado no existe en la lista', () => {
    localStorage.setItem('dulceria.persons',  JSON.stringify([]))
    localStorage.setItem('dulceria.personId', 'u-inexistente')
    render(<App />)
    expect(screen.getByText('Who are you?')).toBeInTheDocument()
  })

  it('no muestra el PersonPicker cuando ya hay una persona válida guardada', () => {
    seedStorage()
    render(<App />)
    expect(screen.queryByText('Who are you?')).not.toBeInTheDocument()
  })
})

describe('App — registro de nueva persona', () => {
  it('registrar una persona nueva cierra el picker y muestra la vista principal', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByText("I'm new, sign me up"))
    await user.type(screen.getByPlaceholderText('e.g. 31000376'), '007')
    await user.type(screen.getByPlaceholderText('e.g. Maria Lopez'), 'James Bond')
    await user.type(screen.getByPlaceholderText('e.g. 3001234567'), '3001234567')
    await user.click(screen.getByText('Register me'))
    expect(screen.queryByText('Who are you?')).not.toBeInTheDocument()
    expect(screen.getByText(/James/)).toBeInTheDocument()
  })
})

describe('App — navegación', () => {
  beforeEach(seedStorage)

  it('muestra la vista Register por defecto', () => {
    render(<App />)
    expect(screen.getByText('Register').closest('button')).toHaveClass('active')
  })

  it('navegar a "My Purchases" cambia la vista', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByText('My Purchases'))
    expect(screen.getByText('Your Purchases')).toBeInTheDocument()
  })

  it('navegar a "Marianita" muestra la pantalla de PIN', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByText('Marianita'))
    expect(screen.getByPlaceholderText('• • • •')).toBeInTheDocument()
  })

  it('ingresar el PIN correcto en la pestaña Marianita muestra el panel', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByText('Marianita'))
    await user.type(screen.getByPlaceholderText('• • • •'), '1234')
    await user.click(screen.getByText('Enter'))
    expect(screen.getByText("Marianita's Panel")).toBeInTheDocument()
  })

  it('volver a otra pestaña tras desbloquear Marianita cierra el panel', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByText('Marianita'))
    await user.type(screen.getByPlaceholderText('• • • •'), '1234')
    await user.click(screen.getByText('Enter'))
    await user.click(screen.getByText('Register'))
    await user.click(screen.getByText('Marianita'))
    expect(screen.getByPlaceholderText('• • • •')).toBeInTheDocument()
  })
})

describe('App — cambio de usuario', () => {
  beforeEach(seedStorage)

  it('el botón de usuario en el header abre el PersonPicker', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByText('#001').closest('button'))
    expect(screen.getByText('Who are you?')).toBeInTheDocument()
  })
})

describe('App — persisencia en localStorage', () => {
  it('guarda la persona seleccionada en localStorage', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByText("I'm new, sign me up"))
    await user.type(screen.getByPlaceholderText('e.g. 31000376'), '042')
    await user.type(screen.getByPlaceholderText('e.g. Maria Lopez'), 'Carla')
    await user.type(screen.getByPlaceholderText('e.g. 3001234567'), '3009876543')
    await user.click(screen.getByText('Register me'))
    expect(localStorage.getItem('dulceria.personId')).toBeTruthy()
    const persons = JSON.parse(localStorage.getItem('dulceria.persons'))
    expect(persons.some(p => p.name === 'Carla')).toBe(true)
  })
})
