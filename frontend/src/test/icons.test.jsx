import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { Icon } from '../icons'
import { MetodoBadge } from '../Components'

vi.mock('react-i18next')

const svgDe = (c) => c.container.querySelector('svg')

describe('Icon', () => {
  it('dibuja un SVG con la clase del icono', () => {
    const c = render(<Icon name="eye" />)
    const svg = svgDe(c)
    expect(svg).toBeInTheDocument()
    expect(svg).toHaveClass('lucide', 'lucide-eye')
  })

  it('dibuja las formas del icono, no un marcador vacío', () => {
    const c = render(<Icon name="eye" />)
    // El ojo de lucide son un path y un círculo.
    expect(svgDe(c).querySelectorAll('path, circle, rect, line').length).toBeGreaterThan(0)
  })

  it('no dibuja nada si el nombre no está registrado', () => {
    const c = render(<Icon name="no-existe" />)
    expect(svgDe(c)).toBeNull()
  })

  it('es decorativo por defecto', () => {
    const c = render(<Icon name="check" />)
    expect(svgDe(c)).toHaveAttribute('aria-hidden', 'true')
    expect(svgDe(c)).not.toHaveAttribute('role')
  })

  it('se anuncia a lectores de pantalla si se le da una etiqueta', () => {
    render(<Icon name="check" label="Listo" />)
    const svg = screen.getByRole('img', { name: 'Listo' })
    expect(svg).not.toHaveAttribute('aria-hidden')
  })

  it('conserva las clases propias además de las de lucide', () => {
    const c = render(<Icon name="search" className="search-bar-icon" />)
    expect(svgDe(c)).toHaveClass('lucide-search', 'search-bar-icon')
  })

  /**
   * Regresión: antes los iconos se pintaban con `createIcons()`, que sustituye el
   * `<i data-lucide>` por un `<svg>` (`parentNode.replaceChild`). El nodo de React
   * quedaba huérfano y el icono NO se actualizaba nunca al cambiar de nombre: al
   * saldar una deuda la fila pasaba a decir "Efectivo" pero seguía con el icono de
   * fiado. Como React dibuja ahora el SVG, el cambio se propaga.
   */
  it('cambia de dibujo cuando cambia el nombre', async () => {
    const user = userEvent.setup()
    function Alterna() {
      const [n, setN] = useState('eye')
      return (
        <>
          <button onClick={() => setN('eye-off')}>cambiar</button>
          <Icon name={n} />
        </>
      )
    }
    const c = render(<Alterna />)
    expect(svgDe(c)).toHaveClass('lucide-eye')
    await user.click(screen.getByText('cambiar'))
    await waitFor(() => expect(svgDe(c)).toHaveClass('lucide-eye-off'))
    expect(svgDe(c)).not.toHaveClass('lucide-eye')
  })
})

describe('MetodoBadge', () => {
  it.each([
    ['cash', 'lucide-banknote'],
    ['transfer', 'lucide-arrow-right-left'],
    ['debt', 'lucide-hand-coins'],
  ])('usa el icono de %s', (method, clase) => {
    const c = render(<MetodoBadge method={method} />)
    expect(svgDe(c)).toHaveClass(clase)
  })

  // El caso real del fallo: una deuda saldada pasa a contar como efectivo.
  it('el icono sigue al método cuando una deuda se salda', async () => {
    const c = render(<MetodoBadge method="debt" />)
    expect(svgDe(c)).toHaveClass('lucide-hand-coins')
    c.rerender(<MetodoBadge method="cash" />)
    await waitFor(() => expect(svgDe(c)).toHaveClass('lucide-banknote'))
    expect(svgDe(c)).not.toHaveClass('lucide-hand-coins')
  })
})
