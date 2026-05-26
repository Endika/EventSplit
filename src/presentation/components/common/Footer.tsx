import { type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

// The Basque flag (ikurriña) has no Unicode emoji, so we draw it inline.
function Ikurrina() {
  return (
    <svg viewBox="0 0 24 16" width="18" height="12" className="rounded-[2px]" aria-hidden="true">
      <rect width="24" height="16" fill="#D52B1E" />
      <g stroke="#009B48" strokeWidth="2.4">
        <line x1="0" y1="0" x2="24" y2="16" />
        <line x1="24" y1="0" x2="0" y2="16" />
      </g>
      <g stroke="#ffffff" strokeWidth="2.4">
        <line x1="12" y1="0" x2="12" y2="16" />
        <line x1="0" y1="8" x2="24" y2="8" />
      </g>
    </svg>
  )
}

const LANGUAGES: { code: string; label: string; short: string; flag: ReactNode }[] = [
  { code: 'en', label: 'English', short: 'EN', flag: <span aria-hidden="true">🇬🇧</span> },
  { code: 'es', label: 'Español', short: 'ES', flag: <span aria-hidden="true">🇪🇸</span> },
  { code: 'eu', label: 'Euskara', short: 'EU', flag: <Ikurrina /> },
]

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
              className={`flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium ${
                active
                  ? 'bg-slate-800 text-slate-200'
                  : 'text-slate-500 hover:bg-slate-900 hover:text-slate-300'
              }`}
              aria-pressed={active}
              title={lang.label}
            >
              <span className="text-sm leading-none">{lang.flag}</span>
              {lang.short}
            </button>
          )
        })}
      </div>
      <div>v{__APP_VERSION__}</div>
    </footer>
  )
}
