import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './en'
import es from './es'
import ko from './ko'

const saved = localStorage.getItem('dulceria.lang') || 'en'

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    es: { translation: es },
    ko: { translation: ko },
  },
  lng: saved,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

i18n.on('languageChanged', lng => localStorage.setItem('dulceria.lang', lng))

export default i18n
