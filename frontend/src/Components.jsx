import { useState, useEffect, useRef, useId } from 'react'
import { Icon } from './icons'
import { useTranslation } from 'react-i18next'
import { verificarPin } from './api'
import { errorText } from './errors'

const LANGS = [
  { code: 'en', label: 'EN' },
  { code: 'es', label: 'ES' },
  { code: 'ko', label: '한' },
]

// Ícono de lucide por método de pago
const METHOD_ICON = { cash: 'banknote', transfer: 'arrow-right-left', debt: 'hand-coins' }

/**
 * Campo de PIN con botón de ver/ocultar.
 *
 * Sin poder ver lo que se escribe, un PIN de 4 dígitos enmascarado se teclea a
 * ciegas; el ojo es lo que hace que confirmar el PIN sea llevadero en móvil.
 * El placeholder ya no son puntos: con `type="password"` un placeholder de
 * puntos es indistinguible de un PIN ya escrito.
 */
export function PinField({ value, onChange, onEnter, placeholder, error, autoFocus, id }) {
  const { t } = useTranslation()
  const [visible, setVisible] = useState(false)

  return (
    <div className="pin-field">
      <input
        id={id}
        className={'pin-input' + (error ? ' pin-error' : '')}
        type={visible ? 'text' : 'password'}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={4}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value.replace(/\D/g, ''))}
        onKeyDown={e => e.key === 'Enter' && onEnter && onEnter()}
        autoFocus={autoFocus}
      />
      <button
        type="button"
        className="pin-toggle"
        onClick={() => setVisible(v => !v)}
        aria-label={visible ? t('picker.hidePin') : t('picker.showPin')}
        aria-pressed={visible}
      >
        <Icon name={visible ? 'eye-off' : 'eye'} />
      </button>
    </div>
  )
}

/** Elementos que pueden recibir foco dentro del diálogo. */
const FOCUSABLES = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled])',
  'select:not([disabled])', 'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])',
].join(',')

/**
 * Diálogo modal accesible.
 *
 * Antes cada modal era un `div` suelto: sin `role="dialog"`, sin `aria-modal`,
 * Escape no cerraba, el foco se quedaba detrás en el `body` y con el tabulador se
 * salía del diálogo hacia la página de fondo.
 *
 * `dismissible={false}` quita las tres formas de cerrar (X, Escape y clic fuera)
 * para el caso del selector de personas: sin identidad la app no se puede usar,
 * y una X que no hace nada es peor que no tenerla.
 */
export function Modal({ title, onClose, onDismiss, dismissible = true, children }) {
  const { t } = useTranslation()
  const caja = useRef(null)
  const tituloId = useId()
  const cerrar = onDismiss || onClose

  useEffect(() => {
    const nodo = caja.current
    const teniaFoco = document.activeElement

    // Si nada de dentro se autoenfocó, llevamos el foco al diálogo.
    if (nodo && !nodo.contains(document.activeElement)) {
      const primero = nodo.querySelector(FOCUSABLES)
      ;(primero || nodo).focus?.()
    }

    // El fondo no debe poder desplazarse mientras el diálogo está abierto.
    const overflowPrevio = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = overflowPrevio
      // Devolvemos el foco a lo que lo tenía antes de abrir.
      if (teniaFoco && document.contains(teniaFoco)) teniaFoco.focus?.()
    }
  }, [])

  const alTeclear = (e) => {
    if (e.key === 'Escape' && dismissible) {
      e.stopPropagation()
      cerrar()
      return
    }
    if (e.key !== 'Tab') return

    // Trampa de foco: el tabulador da la vuelta dentro del diálogo.
    // Sin filtrar por visibilidad: los diálogos muestran u ocultan sus pasos
    // montando y desmontando, no con CSS, así que todo lo que hay es alcanzable.
    const focusables = [...caja.current.querySelectorAll(FOCUSABLES)]
    if (focusables.length === 0) return
    const primero = focusables[0]
    const ultimo = focusables[focusables.length - 1]

    if (e.shiftKey && document.activeElement === primero) {
      e.preventDefault()
      ultimo.focus()
    } else if (!e.shiftKey && document.activeElement === ultimo) {
      e.preventDefault()
      primero.focus()
    }
  }

  return (
    <div className="modal-overlay" onClick={dismissible ? cerrar : undefined}>
      <div
        ref={caja}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        tabIndex={-1}
        onClick={e => e.stopPropagation()}
        onKeyDown={alTeclear}
      >
        <div className="modal-head">
          <h2 id={tituloId}>{title}</h2>
          {dismissible && (
            <button className="icon-btn" onClick={cerrar} aria-label={t('common.close')}>
              <Icon name="x" />
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  )
}

export function Header({ title, person, onChangeUser }) {
  const { i18n } = useTranslation()
  return (
    <header className="app-header">
      <div className="brand">
        <div className="brand-mark">🍬</div>
        <div className="brand-text">
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
            <Icon name="chevron-down" />
          </button>
        )}
      </div>
    </header>
  )
}

export function BottomNav({ view, setView }) {
  const { t } = useTranslation()
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
          <Icon name={item.icon} />
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  )
}

export function MetodoBadge({ method }) {
  const { t } = useTranslation()
  return (
    <span className={'badge method-' + method}>
      <Icon name={METHOD_ICON[method] || 'banknote'} />
      {t('register.' + method)}
    </span>
  )
}

export function PersonPicker({ persons, value, onChange, onClose, onRegister, onVerifyPin, onSetPin, canClose = true }) {
  const { t } = useTranslation()
  const [mode, setMode]           = useState('list')
  const [employeeId, setEmployeeId] = useState('')
  const [name, setName]           = useState('')
  const [phone, setPhone]         = useState('')
  const [pin, setPin]             = useState('')
  const [pin2, setPin2]           = useState('')      // repetición del PIN al registrarse
  const [error, setError]         = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [confirmPerson, setConfirmPerson] = useState(null)
  const [reviewData, setReviewData] = useState(null)
  const [pinValue, setPinValue]   = useState('')
  const [pinValue2, setPinValue2] = useState('')      // repetición al crear el PIN
  const [pinError, setPinError]   = useState('')
  const [pinBusy, setPinBusy]     = useState(false)
  const [forgotOpen, setForgotOpen] = useState(false)
  const [query, setQuery]         = useState('')


  // Paso 1: valida y pasa a la pantalla de revisión de datos.
  const reviewRegister = () => {
    const cleanId    = employeeId.trim()
    const cleanName  = name.trim()
    const cleanPhone = phone.trim()
    if (!cleanId)                                           return setError(t('picker.errEmployee'))
    if (!cleanName)                                         return setError(t('picker.errName'))
    if (!cleanPhone || cleanPhone.length < 10)              return setError(t('picker.errPhone'))
    if (persons.find(p => p.employeeId === cleanId))        return setError(t('picker.errIdTaken'))
    if (!/^\d{4}$/.test(pin))                               return setError(t('picker.errPin'))
    // Sin esta confirmación un dedo torpe dejaba la cuenta bloqueada: el PIN
    // queda guardado como hash y solo Mari puede reiniciarlo.
    if (pin !== pin2)                                       return setError(t('picker.errPinMismatch'))
    setError('')
    setReviewData({ employeeId: cleanId, name: cleanName, phone: cleanPhone, pin })
  }

  // Paso 2: confirma y crea la persona (queda pendiente de aprobación).
  const submitRegister = async () => {
    if (submitting || !reviewData) return
    try {
      setSubmitting(true)
      await onRegister(reviewData)
      onClose()
    } catch (err) {
      setError(errorText(err, t))
    } finally {
      setSubmitting(false)
    }
  }

  const backToList = () => {
    setMode('list'); setError(''); setReviewData(null); setPin(''); setPin2('')
  }

  const chooseConfirm = (p) => {
    setConfirmPerson(p); setPinValue(''); setPinValue2(''); setPinError(''); setForgotOpen(false)
  }

  // Al seleccionarse: si ya tiene PIN lo ingresa; si no, lo crea (reset o usuario viejo).
  const submitPin = async () => {
    if (pinBusy || !confirmPerson) return
    const v = pinValue.trim()
    if (!/^\d{4}$/.test(v)) return setPinError(t('picker.errPin'))
    // Al CREAR el PIN se pide dos veces; al entrar con uno ya existente, no.
    if (!confirmPerson.hasPin && v !== pinValue2.trim()) {
      return setPinError(t('picker.errPinMismatch'))
    }
    setPinBusy(true)
    try {
      if (confirmPerson.hasPin) {
        const ok = await onVerifyPin(confirmPerson.id, v)
        if (!ok) { setPinError(t('picker.pinIncorrect')); setPinValue(''); setPinBusy(false); return }
      } else {
        await onSetPin(confirmPerson.id, v)
      }
      setPinBusy(false)
      onChange(confirmPerson.id)
      onClose()
    } catch (err) {
      setPinError(errorText(err, t))
      setPinValue('')
      setPinValue2('')
      setPinBusy(false)
    }
  }

  // Búsqueda en la lista: con decenas de empleados, desplazarse no es opción.
  const q = query.trim().toLowerCase()
  const visibles = q
    ? persons.filter(p =>
        (p.name || '').toLowerCase().includes(q) || String(p.employeeId).includes(q))
    : persons

  const titulo = confirmPerson ? t('picker.confirmIdentity')
    : reviewData ? t('picker.reviewTitle')
    : mode === 'list' ? t('picker.whoAreYou')
    : t('picker.registerTitle')

  // Dentro de un subpaso, la X vuelve al paso anterior en vez de cerrar.
  const enUnSubpaso = !!(confirmPerson || reviewData)
  const descartar = confirmPerson ? () => setConfirmPerson(null)
    : reviewData ? () => setReviewData(null)
    : onClose

  return (
    <Modal
      title={titulo}
      onClose={onClose}
      onDismiss={descartar}
      dismissible={enUnSubpaso || canClose}
    >
        {confirmPerson && forgotOpen ? (
          <div className="confirm-identity">
            <div className="pin-emoji"><Icon name="key-round" /></div>
            <h2 className="confirm-identity-q">{t('picker.forgotTitle')}</h2>
            <p className="pin-sub">{t('picker.forgotBody')}</p>
            <button className="btn-primary" style={{ width: '100%' }} onClick={() => setForgotOpen(false)}>
              {t('picker.forgotBack')}
            </button>
          </div>
        ) : confirmPerson ? (
          <div className="confirm-identity">
            <span className="avatar lg">{confirmPerson.initial}</span>
            <h2 className="confirm-identity-q">{t('picker.areYou', { name: confirmPerson.name })}</h2>
            <p className="pin-sub">{confirmPerson.hasPin ? t('picker.enterPinHint') : t('picker.createPinHint')}</p>

            <PinField
              value={pinValue}
              onChange={v => { setPinValue(v); setPinError('') }}
              onEnter={submitPin}
              placeholder={t('picker.pinPlaceholder')}
              error={!!pinError}
              autoFocus
            />
            {!confirmPerson.hasPin && (
              <>
                <label className="field-label pin-repeat-label">{t('picker.pinConfirmLabel')}</label>
                <PinField
                  value={pinValue2}
                  onChange={v => { setPinValue2(v); setPinError('') }}
                  onEnter={submitPin}
                  placeholder={t('picker.pinConfirmPlaceholder')}
                  error={!!pinError}
                />
              </>
            )}

            {pinError && <p className="pin-msg">{pinError}</p>}
            <button className="btn-primary" style={{ width: '100%' }} disabled={pinBusy} onClick={submitPin}>
              {pinBusy ? t('picker.processing') : (confirmPerson.hasPin ? t('picker.enterPin') : t('picker.createPin'))}
            </button>
            {confirmPerson.hasPin && (
              <button className="btn-link" disabled={pinBusy} onClick={() => setForgotOpen(true)}>
                {t('picker.forgotPin')}
              </button>
            )}
            <button className="btn-ghost" disabled={pinBusy} onClick={() => setConfirmPerson(null)}>
              {t('picker.notMe')}
            </button>
          </div>
        ) : reviewData ? (
          <div className="confirm-identity">
            <span className="avatar lg">{reviewData.name.charAt(0).toUpperCase()}</span>
            <h2 className="confirm-identity-q">{t('picker.reviewQuestion')}</h2>
            <div className="review-fields">
              <div className="review-row"><span>{t('picker.employeeNumber')}</span><b>#{reviewData.employeeId}</b></div>
              <div className="review-row"><span>{t('picker.yourName')}</span><b>{reviewData.name}</b></div>
              <div className="review-row"><span>{t('picker.phone')}</span><b>{reviewData.phone}</b></div>
              <div className="review-row"><span>{t('picker.pinLabel')}</span><b>• • • •</b></div>
            </div>
            {error && <p className="pin-msg">{error}</p>}
            <button className="btn-primary" style={{ width: '100%' }} disabled={submitting} onClick={submitRegister}>
              {submitting ? t('picker.registering') : t('picker.confirmRegister')}
            </button>
            <button className="btn-ghost" disabled={submitting} onClick={() => setReviewData(null)}>
              {t('picker.back')}
            </button>
          </div>
        ) : mode === 'list' ? (
          <>
            {persons.length > 6 && (
              <div className="picker-search">
                <input
                  className="field-input"
                  type="search"
                  placeholder={t('picker.searchPlaceholder')}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                />
              </div>
            )}
            <div className="persona-list">
              {persons.length === 0 && (
                <p className="picker-empty">{t('picker.noOneYet')}</p>
              )}
              {persons.length > 0 && visibles.length === 0 && (
                <p className="picker-empty">{t('picker.noMatches')}</p>
              )}
              {/* Antes solo se mostraba #número: había que saberse el número de
                  empleado de memoria, y la pantalla siguiente sí decía el nombre. */}
              {visibles.map(p => (
                <button
                  key={p.id}
                  className={'persona-row ' + (value === p.id ? 'sel' : '')}
                  onClick={() => chooseConfirm(p)}
                >
                  <span className="avatar lg">{p.initial}</span>
                  <span className="persona-meta">
                    <span className="persona-name">{p.name}</span>
                    <span className="persona-area">#{p.employeeId}</span>
                  </span>
                  {value === p.id && <Icon name="check" className="sel-check" />}
                </button>
              ))}
            </div>
            <div style={{ padding: '0 12px 20px' }}>
              <button className="btn-add-prod" onClick={() => setMode('new')}>
                <Icon name="plus" /> {t('picker.iAmNew')}
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
                maxLength={20}
                autoComplete="off"
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
                maxLength={80}
                autoComplete="name"
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
                maxLength={15}
                autoComplete="tel"
                placeholder={t('picker.phonePlaceholder')}
                value={phone}
                onChange={e => { setPhone(e.target.value.replace(/\D/g, '')); setError('') }}
              />
            </div>
            <div className="field-group">
              <label className="field-label">{t('picker.pinLabel')}</label>
              <PinField
                value={pin}
                onChange={v => { setPin(v); setError('') }}
                placeholder={t('picker.pinPlaceholder')}
                error={!!error}
              />
            </div>
            <div className="field-group">
              <label className="field-label">{t('picker.pinConfirmLabel')}</label>
              <PinField
                value={pin2}
                onChange={v => { setPin2(v); setError('') }}
                onEnter={reviewRegister}
                placeholder={t('picker.pinConfirmPlaceholder')}
                error={!!error}
              />
            </div>
            {error && <p className="pin-msg">{error}</p>}
            <button className="btn-primary" onClick={reviewRegister} style={{ width: '100%' }}>
              {t('picker.registerBtn')}
            </button>
            <button className="btn-ghost" onClick={backToList}>
              {t('picker.back')}
            </button>
          </div>
        )}
    </Modal>
  )
}

export function PinGate({ onSuccess }) {
  const { t } = useTranslation()
  const [pin, setPin]     = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy]   = useState(false)

  const verify = async () => {
    if (busy) return
    setBusy(true)
    try {
      await verificarPin(pin)
      onSuccess()
    } catch (err) {
      // Con códigos de error ya se distingue "PIN incorrecto" (ERR-025) de
      // "demasiados intentos" (ERR-024), que antes se veían igual.
      setError(errorText(err, t))
      setPin('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="pin-gate">
      <div className="pin-box">
        <div className="pin-emoji"><Icon name="lock" /></div>
        <h2>{t('pin.title')}</h2>
        <p className="pin-sub">{t('pin.subtitle')}</p>
        <PinField
          value={pin}
          onChange={v => { setPin(v); setError('') }}
          onEnter={verify}
          placeholder={t('picker.pinPlaceholder')}
          error={!!error}
          autoFocus
        />
        {error && <p className="pin-msg">{error}</p>}
        <button className="btn-primary" onClick={verify} disabled={busy} style={{ width: '100%', marginTop: '8px' }}>
          {busy ? t('picker.processing') : t('pin.enter')}
        </button>
      </div>
    </div>
  )
}

export function PendingApproval({ onChangeUser }) {
  const { t } = useTranslation()
  return (
    <div className="empty">
      <div className="empty-emoji"><Icon name="hourglass" /></div>
      <h2>{t('pending.title')}</h2>
      <p>{t('pending.desc')}</p>
      <button className="btn-ghost" onClick={onChangeUser} style={{ marginTop: '14px' }}>
        {t('pending.changeUser')}
      </button>
    </div>
  )
}
