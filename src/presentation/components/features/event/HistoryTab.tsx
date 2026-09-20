import type { ComponentType } from 'react'
import { useTranslation } from 'react-i18next'
import { useEventState } from '@/presentation/context/EventContext'
import type { HistoryType } from '@/domain/entities/Event'
import { YouLabel } from '@/presentation/components/common/YouLabel'
import {
  IconCalendar,
  IconCart,
  IconCheck,
  IconLocation,
  IconLock,
  IconMinus,
  IconMoney,
  IconNote,
  IconPencil,
  IconSwap,
  IconTag,
  IconTrash,
  IconUndo,
  IconUnlock,
  IconUsers,
  type IconProps,
} from '@/presentation/components/common/icons'

/**
 * The mark says what kind of change it was: the domain for a new thing, the
 * verb for a change to one. The line beside it says the rest.
 */
const ICONS: Record<HistoryType, ComponentType<IconProps>> = {
  event_created: IconTag,
  user_joined: IconUsers,
  user_removed: IconMinus,
  purchase_added: IconCart,
  purchase_edited: IconPencil,
  purchase_deleted: IconTrash,
  purchase_recovered: IconUndo,
  expense_added: IconMoney,
  expense_edited: IconPencil,
  expense_deleted: IconTrash,
  expense_recovered: IconUndo,
  availability_voted: IconCalendar,
  location_set: IconLocation,
  notes_added: IconNote,
  days_set: IconCalendar,
  user_profile_updated: IconUsers,
  edit_pin_set: IconLock,
  edit_pin_cleared: IconUnlock,
  stage_changed: IconSwap,
  settlement_toggled: IconCheck,
  manual_liquidation_added: IconSwap,
  manual_liquidation_edited: IconPencil,
  manual_liquidation_deleted: IconTrash,
  manual_liquidation_recovered: IconUndo,
  manual_liquidation_share_toggled: IconSwap,
  cloned_from: IconNote,
}

/** Deleting is the one entry that gets to shout. */
const DANGER: ReadonlySet<HistoryType> = new Set([
  'purchase_deleted',
  'expense_deleted',
  'manual_liquidation_deleted',
  'user_removed',
])

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
    <div>
      <h2 className="fineprint">{t('history.title')}</h2>
      <div className="rail mt-1" />
      {entries.length === 0 && <p className="fineprint mt-3">{t('history.empty')}</p>}
      <ul>
        {entries.map((h) => {
          const Mark = ICONS[h.type] ?? IconTag
          return (
            <li key={h.id} className="flex items-start gap-3 border-b border-border py-2.5">
              <Mark
                className={`mt-0.5 size-5 shrink-0 ${DANGER.has(h.type) ? 'text-danger' : 'text-muted'}`}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate font-semibold text-ink">
                    {t(`history.types.${h.type}`)}
                  </span>
                  <span className="shrink-0 tabular-nums text-muted">v{h.version}</span>
                </div>
                <div className="fineprint flex flex-wrap items-center">
                  {t('history.by', { name: nameOf(h.userId) })}
                  <YouLabel userId={h.userId} />
                  {' · '}
                  <span title={h.timestamp}>{formatRelative(h.timestamp, i18n.language)}</span>
                </div>
                <div className="mt-0.5 text-xs text-muted">{h.description}</div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
