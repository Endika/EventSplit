import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useEventState } from '@/presentation/context/EventContext'
import type { HistoryEntry, HistoryType } from '@/domain/entities/Event'
import { YouLabel } from '@/presentation/components/common/YouLabel'
import { Button } from '@/presentation/components/common/Button'
import { DiffViewer } from './DiffViewer'
import { RevertConfirmModal } from './RevertConfirmModal'

const ICONS: Record<HistoryType, string> = {
  event_created: '🎉',
  user_joined: '👤',
  purchase_added: '🛒',
  purchase_edited: '✏️',
  purchase_deleted: '🗑️',
  purchase_recovered: '↺',
  expense_added: '💰',
  availability_voted: '📅',
  location_set: '📍',
  notes_added: '📝',
  days_set: '📆',
  user_profile_updated: '👤',
  revert: '↩️',
  edit_pin_set: '🔒',
  edit_pin_cleared: '🔓',
}

function formatRelative(iso: string, locale: string): string {
  const then = new Date(iso).getTime()
  const now = Date.now()
  const diff = Math.round((now - then) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))
  } catch {
    return iso
  }
}

export function HistoryTab() {
  const { t, i18n } = useTranslation()
  const { event } = useEventState()
  const [selected, setSelected] = useState<HistoryEntry | null>(null)
  const [reverting, setReverting] = useState<HistoryEntry | null>(null)
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
            <Button variant="secondary" onClick={() => setSelected(h)}>
              {t('history.view')}
            </Button>
          </li>
        ))}
      </ul>
      {selected && (
        <DiffViewer
          entry={selected}
          onClose={() => setSelected(null)}
          onRevert={(e) => {
            setSelected(null)
            setReverting(e)
          }}
        />
      )}
      {reverting && (
        <RevertConfirmModal
          entry={reverting}
          onClose={() => setReverting(null)}
        />
      )}
    </div>
  )
}
