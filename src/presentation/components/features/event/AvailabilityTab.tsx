import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useContainer } from '@/presentation/context/ContainerProvider'
import { useEventState } from '@/presentation/context/EventContext'
import { useCurrentUser } from '@/presentation/context/UserContext'
import type { SetEventDaysHandler } from '@/application/handlers/SetEventDaysHandler'
import type { SetAvailabilityBatchHandler } from '@/application/handlers/SetAvailabilityBatchHandler'
import type { LocalStorageCache } from '@/infrastructure/persistence/LocalStorageCache'
import { useWriteGuard } from '@/presentation/context/WriteGuardContext'
import { reportError } from '@/shared/utils/reportError'
import { Button } from '@/presentation/components/common/Button'
import { Input } from '@/presentation/components/common/Input'
import { YouLabel } from '@/presentation/components/common/YouLabel'

function formatDate(iso: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }).format(new Date(iso + 'T00:00:00'))
  } catch {
    return iso
  }
}

type Drafts = Record<string, Record<string, boolean>>

function buildDrafts(
  users: { id: string }[],
  days: string[],
  availability: Record<string, boolean[]>,
): Drafts {
  const drafts: Drafts = {}
  for (const u of users) {
    const saved = availability[u.id] ?? []
    drafts[u.id] = Object.fromEntries(days.map((d, i) => [d, saved[i] ?? false]))
  }
  return drafts
}

export function AvailabilityTab() {
  const { t, i18n } = useTranslation()
  const container = useContainer()
  const { event, setEvent } = useEventState()
  const me = useCurrentUser()
  const { guardedExecute } = useWriteGuard()

  const [newDay, setNewDay] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Drafts>(() =>
    event ? buildDrafts(event.users, event.days, event.availability) : {},
  )

  if (!event) return null

  // Reconcile drafts when the set of users or days changes (e.g. realtime update).
  const draftUserIds = Object.keys(drafts).sort().join(',')
  const eventUserIds = event.users.map((u) => u.id).sort().join(',')
  const firstUserDraft = Object.values(drafts)[0]
  const draftDayCount = firstUserDraft ? Object.keys(firstUserDraft).length : 0
  if (draftUserIds !== eventUserIds || draftDayCount !== event.days.length) {
    setDrafts(buildDrafts(event.users, event.days, event.availability))
  }

  function toggleVote(userId: string, day: string, checked: boolean) {
    setDrafts((prev) => ({
      ...prev,
      [userId]: { ...prev[userId], [day]: checked },
    }))
  }

  function addDay(e: FormEvent) {
    e.preventDefault()
    if (!event || !newDay) return
    if (event.days.includes(newDay)) {
      setError(`${newDay} is already in the list`)
      return
    }
    guardedExecute(async () => {
      setBusy(true)
      setError(null)
      try {
        const handler = container.resolve<SetEventDaysHandler>('setEventDays')
        const next = [...event.days, newDay].sort()
        const result = await handler.execute({ eventId: event.id, days: next })
        container
          .resolve<LocalStorageCache>('cache')
          .set(event.id, { snapshot: result.event, version: result.version })
        setEvent(result.event, result.version)
        setNewDay('')
      } catch (err) {
        reportError('AvailabilityTab', err)
        setError(err instanceof Error ? err.message : 'Error')
      } finally {
        setBusy(false)
      }
    })
  }

  function saveAll() {
    if (!event || !me) return
    guardedExecute(async () => {
      setBusy(true)
      setError(null)
      try {
        const votes: Record<string, boolean[]> = {}
        for (const u of event.users) {
          const draft = drafts[u.id] ?? {}
          votes[u.id] = event.days.map((d) => draft[d] ?? false)
        }
        const handler = container.resolve<SetAvailabilityBatchHandler>('setAvailabilityBatch')
        const result = await handler.execute({
          eventId: event.id,
          editedBy: me.id,
          votes,
        })
        container
          .resolve<LocalStorageCache>('cache')
          .set(event.id, { snapshot: result.event, version: result.version })
        setEvent(result.event, result.version)
      } catch (err) {
        reportError('AvailabilityTab', err)
        setError(err instanceof Error ? err.message : 'Error')
      } finally {
        setBusy(false)
      }
    })
  }

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
        {t('availability.title')}
      </h2>

      <form onSubmit={addDay} className="flex gap-2">
        <Input
          type="date"
          value={newDay}
          onChange={(e) => setNewDay(e.target.value)}
          className="max-w-xs"
        />
        <Button type="submit" disabled={busy || !newDay}>
          {t('availability.addDay')}
        </Button>
      </form>

      {error && <p className="text-sm text-rose-400">{error}</p>}

      {event.days.length === 0 && (
        <p className="text-sm text-slate-400">{t('availability.noDays')}</p>
      )}

      {event.days.length > 0 && (
        <>
          <p className="text-xs text-slate-500">{t('availability.editAnyoneHint')}</p>
          <div
            data-no-swipe
            className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900"
          >
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr>
                  <th className="p-3 text-left">&nbsp;</th>
                  {event.days.map((d) => (
                    <th key={d} className="p-3 text-center font-medium text-slate-300">
                      {formatDate(d, i18n.language)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {event.users.map((u) => {
                  const isMe = me?.id === u.id
                  return (
                    <tr key={u.id} className={isMe ? 'bg-violet-900/30' : ''}>
                      <td className="p-3 text-slate-200">
                        {u.alias ? `${u.name} (${u.alias})` : u.name}
                        <YouLabel userId={u.id} />
                      </td>
                      {event.days.map((d) => {
                        const checked = drafts[u.id]?.[d] ?? false
                        return (
                          <td key={d} className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => toggleVote(u.id, d, e.target.checked)}
                              disabled={busy}
                              className="size-4 rounded border-slate-600 bg-slate-800 accent-violet-500"
                              aria-label={`${u.name} ${formatDate(d, i18n.language)}`}
                            />
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-700 text-xs text-slate-400">
                  <td className="p-3 font-medium">{t('availability.votes')}</td>
                  {event.days.map((d) => {
                    const count = event.users.reduce(
                      (n, u) => n + (drafts[u.id]?.[d] ? 1 : 0),
                      0,
                    )
                    return (
                      <td key={d} className="p-3 text-center">
                        <span className="font-semibold text-teal-300">{count}</span>
                        <span className="text-slate-500">/{event.users.length}</span>
                      </td>
                    )
                  })}
                </tr>
              </tfoot>
            </table>
          </div>

          {me && (
            <Button onClick={saveAll} disabled={busy}>
              {busy ? t('availability.saving') : t('availability.save')}
            </Button>
          )}
        </>
      )}
    </div>
  )
}
