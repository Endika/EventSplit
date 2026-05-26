import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useContainer } from '@/presentation/context/ContainerProvider'
import { useEventState } from '@/presentation/context/EventContext'
import { useCurrentUser } from '@/presentation/context/UserContext'
import type { SetEventDaysHandler } from '@/application/handlers/SetEventDaysHandler'
import type { SetAvailabilityHandler } from '@/application/handlers/SetAvailabilityHandler'
import type { LocalStorageCache } from '@/infrastructure/persistence/LocalStorageCache'
import { useWriteGuard } from '@/presentation/context/WriteGuardContext'
import { Button } from '@/presentation/components/common/Button'
import { reportError } from '@/shared/utils/reportError'
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

export function AvailabilityTab() {
  const { t, i18n } = useTranslation()
  const container = useContainer()
  const { event, setEvent } = useEventState()
  const me = useCurrentUser()

  const { guardedExecute } = useWriteGuard()
  const [newDay, setNewDay] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Local draft of my votes — keyed by day ISO string so adding/removing days stays aligned.
  const [draftVotes, setDraftVotes] = useState<Record<string, boolean>>(() => {
    if (!me || !event) return {}
    const saved = event.availability[me.id] ?? []
    return Object.fromEntries(event.days.map((d, i) => [d, saved[i] ?? false]))
  })

  if (!event) return null

  // Build the votes array for the current event days from the draft, falling back to false.
  function currentVotes(): boolean[] {
    return event!.days.map((d) => draftVotes[d] ?? false)
  }

  function toggleVote(day: string, checked: boolean) {
    setDraftVotes((prev) => ({ ...prev, [day]: checked }))
  }

  function addDay(e: FormEvent) {
    e.preventDefault()
    if (!event) return
    if (!newDay) return
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

  function saveVotes() {
    if (!event || !me) return
    guardedExecute(async () => {
      setBusy(true)
      setError(null)
      try {
        const handler = container.resolve<SetAvailabilityHandler>('setAvailability')
        const result = await handler.execute({
          eventId: event.id,
          userId: me.id,
          votes: currentVotes(),
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
                const savedVotes = event.availability[u.id] ?? event.days.map(() => false)
                return (
                  <tr key={u.id} className={isMe ? 'bg-violet-900/30' : ''}>
                    <td className="p-3 text-slate-200">
                      {u.alias ? `${u.name} (${u.alias})` : u.name}
                      <YouLabel userId={u.id} />
                    </td>
                    {event.days.map((d, i) => {
                      const checked = isMe ? (draftVotes[d] ?? false) : (savedVotes[i] ?? false)
                      return (
                        <td key={d} className="p-3 text-center">
                          {isMe ? (
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => toggleVote(d, e.target.checked)}
                              disabled={busy}
                              className="size-4 rounded border-slate-600 bg-slate-800 accent-violet-500"
                            />
                          ) : (
                            <span className={checked ? 'text-teal-400' : 'text-slate-500'}>
                              {checked ? '✓' : '·'}
                            </span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {event.days.length > 0 && me && (
        <Button onClick={saveVotes} disabled={busy}>
          {busy ? t('availability.saving') : t('availability.save')}
        </Button>
      )}
    </div>
  )
}
