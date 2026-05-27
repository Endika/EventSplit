import { useTranslation } from 'react-i18next'
import { useEventState } from '@/presentation/context/EventContext'
import type { HistoryType } from '@/domain/entities/Event'
import { YouLabel } from '@/presentation/components/common/YouLabel'

const ICONS: Record<HistoryType, string> = {
  event_created: '🎉',
  user_joined: '👤',
  user_removed: '🚪',
  purchase_added: '🛒',
  purchase_edited: '✏️',
  purchase_deleted: '🗑️',
  purchase_recovered: '↺',
  expense_added: '💰',
  expense_edited: '✏️',
  expense_deleted: '🗑️',
  expense_recovered: '↺',
  availability_voted: '📅',
  location_set: '📍',
  notes_added: '📝',
  days_set: '📆',
  user_profile_updated: '👤',
  edit_pin_set: '🔒',
  edit_pin_cleared: '🔓',
  stage_changed: '🔄',
  settlement_toggled: '💸',
}

function formatRelative(iso: string, locale: string): string {
  const then = new Date(iso).getTime()
  const now = Date.now()
  const diff = Math.round((now - then) / 1000)
  try {
    if (diff < 86400) {
      const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
      if (diff < 60) return rtf.format(-diff, 'second')
      if (diff < 3600) return rtf.format(-Math.floor(diff / 60), 'minute')
      return rtf.format(-Math.floor(diff / 3600), 'hour')
    }
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(
      new Date(iso),
    )
  } catch {
    return iso
  }
}

export function HistoryTab() {
  const { t, i18n } = useTranslation()
  const { event } = useEventState()
  if (!event) return null

  const entries = [...event.history].reverse() // latest first
  const nameOf = (id: string) => event.users.find((u) => u.id === id)?.name ?? '?'

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
        {t('history.title')}
      </h2>
      {entries.length === 0 && <p className="text-sm text-slate-400">{t('history.empty')}</p>}
      <ul className="space-y-2">
        {entries.map((h) => (
          <li
            key={h.id}
            className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-900 p-3"
          >
            <span className="text-xl" aria-hidden="true">
              {ICONS[h.type] ?? '•'}
            </span>
            <div className="flex-1">
              <div className="text-sm text-slate-200">
                <span className="font-medium">{t(`history.types.${h.type}`)}</span>
                <span className="text-slate-500"> · v{h.version}</span>
              </div>
              <div className="text-xs text-slate-400">
                {t('history.by', { name: nameOf(h.userId) })}
                <YouLabel userId={h.userId} />
                {' · '}
                <span title={h.timestamp}>{formatRelative(h.timestamp, i18n.language)}</span>
              </div>
              <div className="mt-1 text-xs text-slate-500">{h.description}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
