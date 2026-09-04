import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import en from '../i18n/en'
import es from '../i18n/es'
import ko from '../i18n/ko'
import { errorText, errorCode, isError } from '../errors'

// El catálogo vive en el backend (Apps Script, no importable): lo leemos del .gs.
const aqui = path.dirname(fileURLToPath(import.meta.url))
const catalogo = fs.readFileSync(
  path.resolve(aqui, '../../../backend/Errores.gs'),
  'utf8',
)
const codigosBackend = [...catalogo.matchAll(/'(ERR-\d{3})':/g)].map(m => m[1])

// `t` de mentira: resuelve "errors.ERR-0xx" contra un diccionario e interpola.
const hacerT = (dict) => (clave, params = {}) => {
  const valor = clave.split('.').reduce((o, k) => (o == null ? o : o[k]), dict)
  if (valor === undefined) return clave
  return String(valor).replace(/\{\{(\w+)\}\}/g, (_, k) => params[k] ?? `{{${k}}}`)
}

describe('catálogo de errores', () => {
  it('el backend define códigos', () => {
    expect(codigosBackend.length).toBeGreaterThan(30)
  })

  it.each([['en', en], ['es', es], ['ko', ko]])(
    'todos los códigos del backend están traducidos en %s',
    (_lang, dict) => {
      const faltantes = codigosBackend.filter(c => !dict.errors?.[c])
      expect(faltantes).toEqual([])
    },
  )

  it.each([['en', en], ['es', es], ['ko', ko]])(
    '%s no traduce códigos que el backend ya no usa',
    (_lang, dict) => {
      // ERR-000 es del frontend (fallo de red o error sin código), no del catálogo.
      const sobrantes = Object.keys(dict.errors).filter(
        c => c !== 'ERR-000' && !codigosBackend.includes(c),
      )
      expect(sobrantes).toEqual([])
    },
  )

  it('los tres idiomas tienen exactamente las mismas claves', () => {
    const claves = d => Object.keys(d.errors).sort()
    expect(claves(es)).toEqual(claves(en))
    expect(claves(ko)).toEqual(claves(en))
  })
})

describe('errorText', () => {
  const t = hacerT(en)

  it('traduce por código', () => {
    const err = Object.assign(new Error('PIN incorrecto'), { code: 'ERR-025' })
    expect(errorText(err, t)).toBe('Wrong PIN.')
  })

  it('interpola los parámetros que manda el backend', () => {
    const err = Object.assign(new Error('Cantidad demasiado alta'), {
      code: 'ERR-055',
      params: { max: 100 },
    })
    expect(errorText(err, t)).toBe('That quantity is too high (max 100).')
  })

  it('cae al mensaje del backend si el código no está traducido', () => {
    const err = Object.assign(new Error('Mensaje nuevo del backend'), { code: 'ERR-999' })
    expect(errorText(err, t)).toBe('Mensaje nuevo del backend')
  })

  it('usa el genérico si no hay ni código ni mensaje', () => {
    expect(errorText(new Error(''), t)).toBe(en.errors['ERR-000'])
  })

  it('traduce el mismo código en cada idioma', () => {
    const err = Object.assign(new Error('x'), { code: 'ERR-024' })
    expect(errorText(err, hacerT(es))).toBe(es.errors['ERR-024'])
    expect(errorText(err, hacerT(ko))).toBe(ko.errors['ERR-024'])
  })
})

describe('errorCode / isError', () => {
  it('lee el código', () => {
    expect(errorCode(Object.assign(new Error('x'), { code: 'ERR-021' }))).toBe('ERR-021')
  })
  it('devuelve null para errores sin código', () => {
    expect(errorCode(new Error('boom'))).toBeNull()
    expect(errorCode(undefined)).toBeNull()
  })
  it('compara códigos', () => {
    const err = Object.assign(new Error('x'), { code: 'ERR-021' })
    expect(isError(err, 'ERR-021')).toBe(true)
    expect(isError(err, 'ERR-024')).toBe(false)
  })
})
