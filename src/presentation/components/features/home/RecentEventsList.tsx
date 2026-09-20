import { useTranslation } from 'react-i18next'
import type { CachedEventSummary } from '@/infrastructure/persistence/LocalStorageCache'
import { IconClose } from '@/presentation/components/common/icons'

function formatRelative(iso: string, locale: string): string {
  const then = new Date(iso).getTime()
  const now = Date.now()
  const diff = Math.round((now - then) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(iso))
  } catch {
    return iso
  }
}

export function RecentEventsList({
  items,
  onForget,
}: {
  items: CachedEventSummary[]
  onForget: (id: string) => void
}) {
  const { t, i18n } = useTranslation()
  if (items.length === 0) return null

  function openEvent(id: string) {
    window.history.pushState({}, '', `${import.meta.env.BASE_URL}?event=${id}`)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  return (
    <section>
      <h2 className="fineprint">{t('home.yourEvents')}</h2>
      <div className="rail mt-1" />
      <ul>
        {items.map((e) => (
          <li
            key={e.id}
            className="group flex items-center gap-2 border-b border-border last:border-0"
          >
            <button
              type="button"
              onClick={() => openEvent(e.id)}
              className="min-w-0 flex-1 py-2.5 text-left"
            >
              <div className="truncate font-semibold text-ink">{e.name}</div>
              <div className="fineprint mt-0.5">
                {t('home.lastActivity', { when: formatRelative(e.updatedAt, i18n.language) })}
                {' · '}
                {t('home.participants', { count: e.participantCount })}
              </div>
            </button>
            <button
              type="button"
              onClick={() => onForget(e.id)}
              className="flex size-11 shrink-0 items-center justify-center text-muted hover:text-danger"
              aria-label={t('home.forget')}
              title={t('home.forget')}
            >
              <IconClose className="size-4" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
