import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useContainer } from '@/presentation/context/ContainerProvider'
import type { LocalStorageCache, CachedEventSummary } from '@/infrastructure/persistence/LocalStorageCache'

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

export function RecentEventsList() {
  const { t, i18n } = useTranslation()
  const container = useContainer()
  const cache = container.resolve<LocalStorageCache>('cache')
  const [items, setItems] = useState<CachedEventSummary[]>(() => cache.listAll())

  if (items.length === 0) return null

  function openEvent(id: string) {
    window.history.pushState({}, '', `${import.meta.env.BASE_URL}?event=${id}`)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  function forget(id: string) {
    cache.remove(id)
    setItems(cache.listAll())
  }

  return (
    <section className="mb-6 space-y-2">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {t('home.yourEvents')}
      </h2>
      <ul className="space-y-2">
        {items.map((e) => (
          <li
            key={e.id}
            className="group flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 transition hover:border-slate-700 hover:bg-slate-800"
          >
            <button
              type="button"
              onClick={() => openEvent(e.id)}
              className="flex-1 p-3 text-left"
            >
              <div className="font-medium text-slate-100">{e.name}</div>
              <div className="text-xs text-slate-400">
                {t('home.lastActivity', { when: formatRelative(e.updatedAt, i18n.language) })}
                {' · '}
                {t('home.participants', { count: e.participantCount })}
              </div>
            </button>
            <button
              type="button"
              onClick={() => forget(e.id)}
              className="px-3 py-3 text-sm text-slate-500 hover:text-rose-400"
              aria-label={t('home.forget')}
              title={t('home.forget')}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
