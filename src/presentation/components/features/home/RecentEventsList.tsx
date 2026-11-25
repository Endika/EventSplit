import { useTranslation } from 'react-i18next'
import type { CachedEventSummary } from '@/infrastructure/persistence/LocalStorageCache'
import { IconClose } from '@/presentation/components/common/icons'
import { formatRelative } from '@/presentation/utils/formatRelative'

const WEEK = 604800

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
                {t('home.lastActivity', {
                  when: formatRelative(e.updatedAt, i18n.language, {
                    relativeFor: WEEK,
                    dateFormat: { dateStyle: 'medium' },
                  }),
                })}
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
