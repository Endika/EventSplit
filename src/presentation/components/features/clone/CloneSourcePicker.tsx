import { useTranslation } from 'react-i18next'
import type { CloneSource } from '@/presentation/hooks/useCloneSources'

function formatDate(iso: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(iso))
  } catch {
    return iso.slice(0, 10)
  }
}

/** Which event to copy from. One row per event, tap to choose. */
export function CloneSourcePicker(props: {
  sources: CloneSource[]
  value: string | null
  onChange: (id: string) => void
}) {
  const { sources, value, onChange } = props
  const { t, i18n } = useTranslation()

  if (sources.length === 0) {
    return <p className="text-sm text-muted">{t('clone.noSources')}</p>
  }

  return (
    <ul className="border-t border-border">
      {sources.map((s) => {
        const selected = s.id === value
        return (
          <li key={s.id} className="border-b border-border">
            <button
              type="button"
              onClick={() => onChange(s.id)}
              aria-pressed={selected}
              data-source={s.id}
              className={`flex min-h-11 w-full flex-col items-start justify-center px-3 py-2 text-left ${
                selected ? 'bg-brand text-white dark:text-bg' : 'text-ink hover:bg-elevated'
              }`}
            >
              <span className="text-sm font-semibold">{s.name}</span>
              <span className={`fineprint ${selected ? 'text-white dark:text-bg' : ''}`}>
                {t('clone.sourceMeta', {
                  count: s.participantCount,
                  date: formatDate(s.updatedAt, i18n.language),
                })}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
