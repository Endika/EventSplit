import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import en from './locales/en/translation.json'
import es from './locales/es/translation.json'
import eu from './locales/eu/translation.json'
import gl from './locales/gl/translation.json'
import ca from './locales/ca/translation.json'
import va from './locales/va/translation.json'

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
      eu: { translation: eu },
      gl: { translation: gl },
      ca: { translation: ca },
      va: { translation: va },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'es', 'eu', 'gl', 'ca', 'va'],
    interpolation: { escapeValue: false },
    detection: { order: ['localStorage', 'navigator'], caches: ['localStorage'] },
  })

// The document must declare the language it is actually showing: six locales
// behind a hardcoded lang attribute is a lie a screen reader reads out loud.
function syncDocumentLang(lng: string): void {
  if (typeof document !== 'undefined') document.documentElement.lang = lng
}
syncDocumentLang(i18n.language || 'es')
i18n.on('languageChanged', syncDocumentLang)

export default i18n
