import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { Modal, PersonPicker } from '../Components'

vi.mock('react-i18next')
vi.mock('../api')

const propsPicker = {
  persons: [],
  value: null,
  onChange: vi.fn(),
  onClose: vi.fn(),
  onRegister: vi.fn(),
  onVerifyPin: vi.fn(),
  onSetPin: vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()
  document.body.style.overflow = ''
})

describe('Modal — semántica', () => {
  it('se anuncia como diálogo modal', () => {
    render(<Modal title="Confirmar" onClose={vi.fn()}><p>hola</p></Modal>)
    const dialogo = screen.getByRole('dialog')
    expect(dialogo).toHaveAttribute('aria-modal', 'true')
  })

  it('toma su nombre accesible del título', () => {
    render(<Modal title="Pagar tu cuenta" onClose={vi.fn()}><p>hola</p></Modal>)
    expect(screen.getByRole('dialog', { name: 'Pagar tu cuenta' })).toBeInTheDocument()
  })

  it('el botón de cerrar tiene etiqueta para lectores de pantalla', () => {
    render(<Modal title="X" onClose={vi.fn()}><p>hola</p></Modal>)
    expect(screen.getByLabelText('Close')).toBeInTheDocument()
  })
})

describe('Modal — formas de cerrar', () => {
  it('Escape cierra', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<Modal title="X" onClose={onClose}><button>algo</button></Modal>)
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('el clic fuera cierra', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const c = render(<Modal title="X" onClose={onClose}><button>algo</button></Modal>)
    await user.click(c.container.querySelector('.modal-overlay'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('el clic dentro NO cierra', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<Modal title="X" onClose={onClose}><button>algo</button></Modal>)
    await user.click(screen.getByText('algo'))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('con dismissible=false no hay X, ni Escape, ni clic fuera', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const c = render(
      <Modal title="X" onClose={onClose} dismissible={false}><button>algo</button></Modal>,
    )
    expect(screen.queryByLabelText('Close')).not.toBeInTheDocument()
    await user.keyboard('{Escape}')
    await user.click(c.container.querySelector('.modal-overlay'))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('onDismiss tiene prioridad sobre onClose para la X', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const onDismiss = vi.fn()
    render(<Modal title="X" onClose={onClose} onDismiss={onDismiss}><button>algo</button></Modal>)
    await user.click(screen.getByLabelText('Close'))
    expect(onDismiss).toHaveBeenCalledOnce()
    expect(onClose).not.toHaveBeenCalled()
  })
})

describe('Modal — foco y scroll', () => {
  it('lleva el foco dentro al abrirse', () => {
    render(<Modal title="X" onClose={vi.fn()}><button>primero</button></Modal>)
    expect(document.activeElement).not.toBe(document.body)
    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true)
  })

  it('respeta un autoFocus interno en vez de robarle el foco', () => {
    render(
      <Modal title="X" onClose={vi.fn()}>
        <button>primero</button>
        <input autoFocus placeholder="campo" />
      </Modal>,
    )
    expect(document.activeElement).toBe(screen.getByPlaceholderText('campo'))
  })

  it('devuelve el foco a quien lo tenía al cerrarse', async () => {
    const user = userEvent.setup()
    function Host() {
      const [abierto, setAbierto] = useState(false)
      return (
        <>
          <button onClick={() => setAbierto(true)}>abrir</button>
          {abierto && <Modal title="X" onClose={() => setAbierto(false)}><button>dentro</button></Modal>}
        </>
      )
    }
    render(<Host />)
    const disparador = screen.getByText('abrir')
    await user.click(disparador)
    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true)
    await user.keyboard('{Escape}')
    expect(document.activeElement).toBe(disparador)
  })

  it('bloquea el scroll del fondo mientras está abierto y lo restaura al cerrar', () => {
    const c = render(<Modal title="X" onClose={vi.fn()}><button>algo</button></Modal>)
    expect(document.body.style.overflow).toBe('hidden')
    c.unmount()
    expect(document.body.style.overflow).toBe('')
  })

  it('el tabulador da la vuelta dentro del diálogo', async () => {
    const user = userEvent.setup()
    render(
      <Modal title="X" onClose={vi.fn()}>
        <button>uno</button>
        <button>dos</button>
      </Modal>,
    )
    const cerrar = screen.getByLabelText('Close')
    const dos = screen.getByText('dos')

    dos.focus()
    await user.tab()
    // Tras el último vuelve al primero (la X), no se escapa al fondo.
    expect(document.activeElement).toBe(cerrar)

    await user.tab({ shift: true })
    expect(document.activeElement).toBe(dos)
  })
})

describe('PersonPicker — no se puede descartar sin identidad', () => {
  const personas = [{ id: 'u-1', employeeId: '001', name: 'Ana', initial: 'A', hasPin: true }]

  it('sin persona elegida no ofrece cerrar', () => {
    render(<PersonPicker {...propsPicker} persons={personas} canClose={false} />)
    expect(screen.queryByLabelText('Close')).not.toBeInTheDocument()
  })

  it('con persona elegida sí se puede cerrar', () => {
    render(<PersonPicker {...propsPicker} persons={personas} value="u-1" canClose />)
    expect(screen.getByLabelText('Close')).toBeInTheDocument()
  })

  it('dentro de un subpaso la X vuelve atrás aunque no se pueda cerrar', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<PersonPicker {...propsPicker} persons={personas} canClose={false} onClose={onClose} />)
    await user.click(screen.getByText('Ana'))
    expect(screen.getByText('Are you Ana?')).toBeInTheDocument()
    await user.click(screen.getByLabelText('Close'))
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByText('Who are you?')).toBeInTheDocument()
  })
})
