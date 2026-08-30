import { type FormEvent, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useContainer } from '@/presentation/context/ContainerProvider'
import { useEventState } from '@/presentation/context/EventContext'
import { useCurrentUser } from '@/presentation/context/UserContext'
import type { SetDayOptionsHandler } from '@/application/handlers/SetDayOptionsHandler'
import type { SetAvailabilityBatchHandler } from '@/application/handlers/SetAvailabilityBatchHandler'
import type { SetAvailabilityMetaHandler } from '@/application/handlers/SetAvailabilityMetaHandler'
import { useWriteGuard } from '@/presentation/context/WriteGuardContext'
import { reportError } from '@/shared/utils/reportError'
import { friendlyError } from '@/presentation/utils/friendlyError'
import { Button } from '@/presentation/components/common/Button'
import { Input } from '@/presentation/components/common/Input'
import { Modal } from '@/presentation/components/common/Modal'
import { optionKey, type DayOption } from '@/domain/value-objects/DayOption'
import { votesPerOption } from '@/domain/services/availabilityHeat'
import { pickTableOptions } from '@/domain/services/pickTableOptions'
import { formatOptionLabel } from '@/presentation/utils/formatOptionLabel'
import { useAvailabilityDraft } from '@/presentation/hooks/useAvailabilityDraft'
import { useAvailabilityView } from '@/presentation/hooks/useAvailabilityView'
import { AvailabilityMatrix } from './AvailabilityMatrix'
import { DayOptionsCalendar } from './DayOptionsCalendar'
import { VotingCalendar } from './VotingCalendar'
import { OptionVoteList } from './OptionVoteList'

export function AvailabilityTab() {
  const { t, i18n } = useTranslation()
  const container = useContainer()
  const { event, setEvent } = useEventState()
  const me = useCurrentUser()
  const { guardedExecute } = useWriteGuard()
  const draft = useAvailabilityDraft(event)
  const [view, setView] = useAvailabilityView()

  const [newDay, setNewDay] = useState('')
  const [note, setNote] = useState(event?.availabilityNote ?? '')
  const [showChildren, setShowChildren] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [optionToRemove, setOptionToRemove] = useState<string | null>(null)
  const [editingDays, setEditingDays] = useState(false)

  const matrixUsers = useMemo(
    () =>
      showChildren ? (event?.users ?? []) : (event?.users ?? []).filter((u) => u.kind === 'adult'),
    [event, showChildren],
  )

  // The column set comes from *saved* votes so it does not reshuffle while
  // someone is ticking boxes.
  const tableIndexes = useMemo(() => {
    if (!event) return []
    const saved = votesPerOption(
      event.dayOptions,
      event.availability,
      matrixUsers.map((u) => u.id),
    )
    return pickTableOptions(event.dayOptions, saved, event.chosenOptions)
  }, [event, matrixUsers])

  if (!event) return null

  const savedVotesForOption = (key: string): number => {
    const idx = event.dayOptions.findIndex((o) => optionKey(o) === key)
    if (idx < 0) return 0
    return event.users.reduce((n, u) => n + (event.availability[u.id]?.[idx] ? 1 : 0), 0)
  }

  const removableKeys = event.dayOptions
    .map(optionKey)
    .filter((key) => savedVotesForOption(key) === 0)

  const childCount = event.users.filter((u) => u.kind === 'child').length
  const voterIds = matrixUsers.map((u) => u.id)

  // Live counts: the same figure the table foot shows, so the two views can
  // never contradict each other.
  const liveCounts = event.dayOptions.map((o) => draft.votesFor(optionKey(o), voterIds))
  const myVotes = Object.fromEntries(
    event.dayOptions.map((o) => [optionKey(o), me ? draft.voteOf(me.id, optionKey(o)) : false]),
  )
  const draftNotes = Object.fromEntries(
    event.dayOptions.map((o) => [optionKey(o), draft.noteOf(optionKey(o))]),
  )
  const savedVotesByKey = Object.fromEntries(
    event.dayOptions.map((o) => [optionKey(o), savedVotesForOption(optionKey(o))]),
  )

  function toggleMyVote(key: string) {
    if (!me) return
    draft.setVote(me.id, key, !draft.voteOf(me.id, key))
  }

  async function commitOptions(options: DayOption[]) {
    const handler = container.resolve<SetDayOptionsHandler>('setDayOptions')
    const result = await handler.execute({ eventId: event!.id, options })
    setEvent(result.event, result.version)
  }

  function addDay(e: FormEvent) {
    e.preventDefault()
    if (!newDay) return
    const key = `${newDay}..${newDay}`
    if (event!.dayOptions.some((o) => optionKey(o) === key)) {
      setError(t('availability.dayAlreadyExists'))
      return
    }
    guardedExecute(async () => {
      setBusy(true)
      setError(null)
      try {
        await commitOptions([
          ...draft.optionsWithNotes(),
          { start: newDay, end: newDay, note: null },
        ])
        setNewDay('')
      } catch (err) {
        reportError('AvailabilityTab', err)
        setError(friendlyError(err, t))
      } finally {
        setBusy(false)
      }
    })
  }

  function removeOption(key: string) {
    const next = draft.optionsWithNotes().filter((o) => optionKey(o) !== key)
    if (next.length === 0) {
      setError(t('availability.cannotRemoveLast'))
      return
    }
    guardedExecute(async () => {
      setBusy(true)
      setError(null)
      try {
        await commitOptions(next)
      } catch (err) {
        reportError('AvailabilityTab', err)
        setError(friendlyError(err, t))
      } finally {
        setBusy(false)
      }
    })
  }

  /**
   * One write per area that actually changed — options (which carry the notes),
   * votes, and the availability meta (pins plus the shared note). Every event is
   * a single JSONB blob, so a needless write costs every connected client a full
   * download of it.
   */
  function saveAll() {
    if (!me) return
    guardedExecute(async () => {
      setBusy(true)
      setError(null)
      try {
        const notesChanged = event!.dayOptions.some((o) => o.note !== draft.noteOf(optionKey(o)))
        if (notesChanged) await commitOptions(draft.optionsWithNotes())

        // From the calendar and the list only my own row goes up, so a stale
        // draft cannot overwrite what someone else saved meanwhile. Filling in
        // for other people stays a table-only power.
        const batch = container.resolve<SetAvailabilityBatchHandler>('setAvailabilityBatch')
        const voteResult = await batch.execute({
          eventId: event!.id,
          editedBy: me.id,
          votes:
            view === 'table'
              ? draft.matrix(event!.users.map((u) => u.id))
              : { [me.id]: draft.rowFor(me.id) },
        })
        setEvent(voteResult.event, voteResult.version)

        const pinsChanged =
          draft.pins.length !== event!.chosenOptions.length ||
          draft.pins.some((k) => !event!.chosenOptions.includes(k))
        const noteChanged = (event!.availabilityNote ?? '') !== note.trim()
        if (pinsChanged || noteChanged) {
          const meta = container.resolve<SetAvailabilityMetaHandler>('setAvailabilityMeta')
          const metaResult = await meta.execute({
            eventId: event!.id,
            userId: me.id,
            note: note.trim() || null,
            chosenOptions: draft.pins,
          })
          setEvent(metaResult.event, metaResult.version)
        }

        draft.reset()
      } catch (err) {
        reportError('AvailabilityTab', err)
        setError(friendlyError(err, t))
      } finally {
        setBusy(false)
      }
    })
  }

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
        {t('availability.title')}
      </h2>

      <textarea
        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-base text-ink placeholder-muted focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand sm:text-sm"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={200}
        rows={2}
        placeholder={t('availability.notePlaceholder')}
      />

      {childCount > 0 && (
        <label className="flex items-center gap-2 text-xs text-muted">
          <input
            type="checkbox"
            checked={showChildren}
            onChange={(e) => setShowChildren(e.target.checked)}
            className="size-4 rounded border-border bg-elevated accent-brand"
          />
          {t('availability.showChildren', { count: childCount })}
        </label>
      )}

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

      {error && <p className="text-sm text-danger">{error}</p>}

      {event.dayOptions.length === 0 && (
        <p className="text-sm text-muted">{t('availability.noDays')}</p>
      )}

      {event.dayOptions.length > 0 && (
        <>
          <div data-no-swipe className="flex gap-1 rounded-xl border border-border bg-surface p-1">
            {(['calendar', 'table'] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                aria-pressed={view === v}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${
                  view === v ? 'bg-brand-soft text-brand-soft-fg' : 'text-muted hover:text-ink'
                }`}
              >
                {v === 'calendar' ? t('availability.viewCalendar') : t('availability.viewTable')}
              </button>
            ))}
          </div>

          {view === 'calendar' && (
            <div className="space-y-3">
              <VotingCalendar
                options={event.dayOptions}
                counts={liveCounts}
                totalVoters={voterIds.length}
                myVotes={myVotes}
                pins={draft.pins}
                onToggleMine={toggleMyVote}
                canVote={me !== null}
              />
              <Button type="button" variant="secondary" onClick={() => setEditingDays(true)}>
                {t('availability.addDay')}
              </Button>
              <OptionVoteList
                options={event.dayOptions}
                counts={liveCounts}
                totalVoters={voterIds.length}
                myVotes={myVotes}
                pins={draft.pins}
                notes={draftNotes}
                onToggleMine={toggleMyVote}
                onTogglePin={draft.togglePin}
                onSetNote={draft.setNote}
                canVote={me !== null}
              />
            </div>
          )}

          {view === 'table' && (
            <>
              <p className="text-xs text-muted">{t('availability.editAnyoneHint')}</p>

              <AvailabilityMatrix
                users={matrixUsers}
                options={event.dayOptions}
                optionIndexes={tableIndexes}
                hiddenCount={event.dayOptions.length - tableIndexes.length}
                pins={draft.pins}
                meId={me?.id ?? null}
                removableKeys={removableKeys}
                voteOf={draft.voteOf}
                onVote={draft.setVote}
                onTogglePin={draft.togglePin}
                onRemove={setOptionToRemove}
                busy={busy}
              />
            </>
          )}

          {me && (
            <Button onClick={saveAll} disabled={busy}>
              {busy ? t('availability.saving') : t('availability.save')}
            </Button>
          )}
        </>
      )}

      {editingDays && (
        <Modal
          open
          title={t('availability.addDay')}
          dismissable={!busy}
          onClose={() => setEditingDays(false)}
        >
          <DayOptionsCalendar
            options={event.dayOptions}
            votesByKey={savedVotesByKey}
            busy={busy}
            onCommit={(next) => {
              setEditingDays(false)
              guardedExecute(async () => {
                setBusy(true)
                setError(null)
                try {
                  await commitOptions(next)
                } catch (err) {
                  reportError('AvailabilityTab', err)
                  setError(friendlyError(err, t))
                } finally {
                  setBusy(false)
                }
              })
            }}
          />
        </Modal>
      )}

      {optionToRemove && (
        <Modal
          open
          title={t('availability.removeDayTitle')}
          dismissable={!busy}
          onClose={() => setOptionToRemove(null)}
        >
          <div className="space-y-3">
            <p className="text-sm text-ink">
              {t('availability.removeDayConfirm', {
                date: formatOptionLabel(
                  event.dayOptions.find((o) => optionKey(o) === optionToRemove) ?? {
                    start: optionToRemove.slice(0, 10),
                    end: optionToRemove.slice(0, 10),
                    note: null,
                  },
                  i18n.language,
                ),
              })}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setOptionToRemove(null)}
                disabled={busy}
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  const key = optionToRemove
                  setOptionToRemove(null)
                  removeOption(key)
                }}
                disabled={busy}
              >
                {t('availability.removeDayYes')}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
