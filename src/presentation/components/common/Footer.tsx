import { useTranslation } from 'react-i18next'

const LANGUAGES = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'es', label: 'Español', short: 'ES' },
  { code: 'eu', label: 'Euskara', short: 'EU' },
] as const

export function Footer() {
  const { i18n } = useTranslation()
  const current = i18n.resolvedLanguage ?? i18n.language ?? 'en'

  function changeTo(code: string) {
    void i18n.changeLanguage(code)
  }

  return (
    <footer className="mt-12 flex flex-col items-center gap-2 pb-4 text-xs text-slate-600">
      <div className="flex gap-1" role="group" aria-label="Language">
        {LANGUAGES.map((lang) => {
          const active = current.startsWith(lang.code)
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => changeTo(lang.code)}
              className={`rounded px-2 py-1 text-xs font-medium ${
                active
                  ? 'bg-slate-800 text-slate-200'
                  : 'text-slate-500 hover:bg-slate-900 hover:text-slate-300'
              }`}
              aria-pressed={active}
              title={lang.label}
            >
              {lang.short}
            </button>
          )
        })}
      </div>
      <div>v{__APP_VERSION__}</div>
    </footer>
  )
}
