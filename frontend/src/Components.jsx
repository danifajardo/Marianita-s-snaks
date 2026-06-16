import { useState, useEffect } from 'react'
import { createIcons } from 'lucide'
import * as icons from 'lucide'
import { useTranslation } from 'react-i18next'
import { verificarPin } from './api'

const LANGS = [
  { code: 'en', label: 'EN' },
  { code: 'es', label: 'ES' },
  { code: 'ko', label: '한' },
]

// Ícono de lucide por método de pago
const METHOD_ICON = { cash: 'banknote', transfer: 'arrow-right-left', debt: 'hand-coins' }

export function Header({ title, person, onChangeUser }) {
  const { i18n } = useTranslation()
  useEffect(() => { createIcons({ icons }) })
  return (
    <header className="app-header">
      <div className="brand">
        <div className="brand-mark">🍬</div>
        <div>
          <div className="brand-word">Snacks Marianita</div>
          <div className="brand-sub">{title}</div>
        </div>
      </div>
      <div className="header-right">
        <div className="lang-switcher">
          {LANGS.map(l => (
            <button
              key={l.code}
              className={i18n.language === l.code ? 'on' : ''}
              onClick={() => i18n.changeLanguage(l.code)}
            >
              {l.label}
            </button>
          ))}
        </div>
        {person && (
          <button className="who" onClick={onChangeUser}>
            <span className="avatar">{person.initial}</span>
            <span className="who-name">#{person.employeeId}</span>
            <i data-lucide="chevron-down"></i>
          </button>
        )}
      </div>
    </header>
  )
}

export function BottomNav({ view, setView }) {
  const { t } = useTranslation()
  useEffect(() => { createIcons({ icons }) })
  const items = [
    { id: 'register',    icon: 'shopping-bag', label: t('nav.register') },
    { id: 'myPurchases', icon: 'clock',         label: t('nav.myPurchases') },
    { id: 'marianita',   icon: 'package',        label: t('nav.marianita') },
  ]
  return (
    <nav className="bottom-nav">
      {items.map(item => (
        <button
          key={item.id}
          className={'nav-item ' + (view === item.id ? 'active' : '')}
          onClick={() => setView(item.id)}
        >
          <i data-lucide={item.icon}></i>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  )
}

export function MetodoBadge({ method }) {
  const { t } = useTranslation()
  useEffect(() => { createIcons({ icons }) })
  return (
    <span className={'badge method-' + method}>
      <i data-lucide={METHOD_ICON[method] || 'banknote'}></i>
      {t('register.' + method)}
    </span>
  )
}

export function PersonPicker({ persons, value, onChange, onClose, onRegister }) {
  const { t } = useTranslation()
  const [mode, setMode]           = useState('list')
  const [employeeId, setEmployeeId] = useState('')
  const [name, setName]           = useState('')
  const [phone, setPhone]         = useState('')
  const [error, setError]         = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [confirmPerson, setConfirmPerson] = useState(null)

  useEffect(() => { createIcons({ icons }) })

  const handleRegister = async () => {
    const cleanId    = employeeId.trim()
    const cleanName  = name.trim()
    const cleanPhone = phone.trim()
    if (!cleanId)                                           return setError(t('picker.errEmployee'))
    if (!cleanName)                                         return setError(t('picker.errName'))
    if (!cleanPhone || cleanPhone.length < 10)              return setError(t('picker.errPhone'))
    if (persons.find(p => p.employeeId === cleanId))        return setError(t('picker.errIdTaken'))
    try {
      setSubmitting(true)
      await onRegister({ employeeId: cleanId, name: cleanName, phone: cleanPhone })
      onClose()
    } catch (err) {
      setError(err?.message || t('picker.errGeneric'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{confirmPerson ? t('picker.confirmIdentity') : mode === 'list' ? t('picker.whoAreYou') : t('picker.registerTitle')}</h2>
          <button className="icon-btn" onClick={confirmPerson ? () => setConfirmPerson(null) : onClose}>
            <i data-lucide="x"></i>
          </button>
        </div>

        {confirmPerson ? (
          <div className="confirm-identity">
            <span className="avatar lg">{confirmPerson.initial}</span>
            <h2 className="confirm-identity-q">{t('picker.areYou', { name: confirmPerson.name })}</h2>
            <button
              className="btn-primary"
              style={{ width: '100%' }}
              onClick={() => { onChange(confirmPerson.id); onClose() }}
            >
              {t('picker.yesItsMe')}
            </button>
            <button className="btn-ghost" onClick={() => setConfirmPerson(null)}>
              {t('picker.notMe')}
            </button>
          </div>
        ) : mode === 'list' ? (
          <>
            <div className="persona-list">
              {persons.length === 0 && (
                <p style={{ textAlign: 'center', color: 'var(--fg-muted)', padding: '20px 0' }}>
                  {t('picker.noOneYet')}
                </p>
              )}
              {persons.map(p => (
                <button
                  key={p.id}
                  className={'persona-row ' + (value === p.id ? 'sel' : '')}
                  onClick={() => setConfirmPerson(p)}
                >
                  <span className="avatar lg">{p.initial}</span>
                  <span className="persona-meta">
                    <span className="persona-name">#{p.employeeId}</span>
                  </span>
                  {value === p.id && <i data-lucide="check" className="sel-check"></i>}
                </button>
              ))}
            </div>
            <div style={{ padding: '0 12px 20px' }}>
              <button className="btn-add-prod" onClick={() => setMode('new')}>
                <i data-lucide="plus"></i> {t('picker.iAmNew')}
              </button>
            </div>
          </>
        ) : (
          <div style={{ padding: '8px 20px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="field-group">
              <label className="field-label">{t('picker.employeeNumber')}</label>
              <input
                className="field-input"
                type="text"
                inputMode="numeric"
                placeholder={t('picker.empPlaceholder')}
                value={employeeId}
                onChange={e => { setEmployeeId(e.target.value.replace(/\D/g, '')); setError('') }}
              />
            </div>
            <div className="field-group">
              <label className="field-label">{t('picker.yourName')}</label>
              <input
                className="field-input"
                type="text"
                placeholder={t('picker.namePlaceholder')}
                value={name}
                onChange={e => { setName(e.target.value); setError('') }}
              />
            </div>
            <div className="field-group">
              <label className="field-label">{t('picker.phone')}</label>
              <input
                className="field-input"
                type="tel"
                inputMode="numeric"
                placeholder={t('picker.phonePlaceholder')}
                value={phone}
                onChange={e => { setPhone(e.target.value.replace(/\D/g, '')); setError('') }}
              />
            </div>
            {error && <p className="pin-msg">{error}</p>}
            <button className="btn-primary" onClick={handleRegister} disabled={submitting} style={{ width: '100%' }}>
              {submitting ? t('picker.registering') : t('picker.registerBtn')}
            </button>
            <button className="btn-ghost" onClick={() => { setMode('list'); setError('') }}>
              {t('picker.back')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export function PinGate({ onSuccess }) {
  const { t } = useTranslation()
  const [pin, setPin]     = useState('')
  const [error, setError] = useState(false)

  const verify = async () => {
    const ok = await verificarPin(pin)
    if (ok) {
      onSuccess()
    } else {
      setError(true)
      setPin('')
      setTimeout(() => setError(false), 1200)
    }
  }

  return (
    <div className="pin-gate">
      <div className="pin-box">
        <div className="pin-emoji">🔒</div>
        <h2>{t('pin.title')}</h2>
        <p className="pin-sub">{t('pin.subtitle')}</p>
        <input
          className={'pin-input' + (error ? ' pin-error' : '')}
          type="password"
          inputMode="numeric"
          maxLength={4}
          placeholder="• • • •"
          value={pin}
          onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
          onKeyDown={e => e.key === 'Enter' && verify()}
          autoFocus
        />
        {error && <p className="pin-msg">{t('pin.incorrect')}</p>}
        <button className="btn-primary" onClick={verify} style={{ width: '100%', marginTop: '8px' }}>
          {t('pin.enter')}
        </button>
      </div>
    </div>
  )
}
