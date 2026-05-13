import { describe, it, expect } from 'vitest'
import { formatCOP, relativeDate } from '../data'

describe('formatCOP', () => {
  it('formatea un número de cuatro dígitos con separador de miles', () => {
    expect(formatCOP(2000)).toBe('$ 2.000')
  })

  it('formatea un número de seis dígitos con dos separadores', () => {
    expect(formatCOP(1000000)).toBe('$ 1.000.000')
  })

  it('formatea un número menor a mil sin separador', () => {
    expect(formatCOP(800)).toBe('$ 800')
  })

  it('formatea cero correctamente', () => {
    expect(formatCOP(0)).toBe('$ 0')
  })

  it('formatea cantidades típicas de la dulcería', () => {
    expect(formatCOP(2300)).toBe('$ 2.300')
    expect(formatCOP(9000)).toBe('$ 9.000')
  })
})

describe('relativeDate', () => {
  const tMock = (key, opts) => {
    if (key === 'dates.today')     return 'Today'
    if (key === 'dates.yesterday') return 'Yesterday'
    if (key === 'dates.daysAgo')   return `${opts?.count} days ago`
    return key
  }

  it('retorna "Today" para una fecha de hoy', () => {
    const hoy = new Date().toISOString()
    expect(relativeDate(hoy, tMock, 'en')).toBe('Today')
  })

  it('retorna "Yesterday" para una fecha de hace un día exacto', () => {
    const ayer = new Date(Date.now() - 1000 * 60 * 60 * 25).toISOString()
    expect(relativeDate(ayer, tMock, 'en')).toBe('Yesterday')
  })

  it('retorna "N days ago" para fechas de hace 2 a 6 días', () => {
    const hace3 = new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString()
    expect(relativeDate(hace3, tMock, 'en')).toBe('3 days ago')
  })

  it('retorna una fecha formateada para fechas de hace 7 días o más', () => {
    const hace10 = new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString()
    const resultado = relativeDate(hace10, tMock, 'en')
    expect(resultado).toMatch(/\d/)
  })

  it('funciona sin pasar t ni lang', () => {
    const hoy = new Date().toISOString()
    expect(relativeDate(hoy)).toBe('Hoy')
  })
})
