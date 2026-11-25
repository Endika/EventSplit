import { useCallback, useMemo, useState } from 'react'
import type { EventSnapshot } from '@/domain/entities/Event'
import { normalizeNote, optionKey, type DayOption } from '@/domain/value-objects/DayOption'

type VoteOverlay = Record<string, Record<string, boolean>>

/**
 * The unsaved state of the availability tab, shared by the calendar, the option
 * list and the table so switching view never loses a tick.
 *
 * It holds only what the user has *touched*, layered over what is saved. That
 * way a realtime update — a new option, someone else's vote — shows up straight
 * away without a reconciliation pass that could drop a pending edit or shift a
 * vote onto the wrong option.
 */
export function useAvailabilityDraft(event: EventSnapshot | null) {
  const [votes, setVotes] = useState<VoteOverlay>({})
  const [pinOverlay, setPinOverlay] = useState<string[] | null>(null)
  const [noteOverlay, setNoteOverlay] = useState<Record<string, string | null>>({})

  const options = useMemo(() => event?.dayOptions ?? [], [event])
  const keys = useMemo(() => options.map(optionKey), [options])

  const savedVote = useCallback(
    (userId: string, key: string): boolean => {
      const idx = keys.indexOf(key)
      return event?.availability[userId]?.[idx] ?? false
    },
    [event, keys],
  )

  const voteOf = useCallback(
    (userId: string, key: string): boolean => votes[userId]?.[key] ?? savedVote(userId, key),
    [votes, savedVote],
  )

  // Stryker disable ArrayDeclaration: a constant dependency list is never read
  const setVote = useCallback((userId: string, key: string, value: boolean) => {
    setVotes((prev) => ({ ...prev, [userId]: { ...prev[userId], [key]: value } }))
  }, [])
  // Stryker restore ArrayDeclaration

  const votesFor = useCallback(
    (key: string, userIds: string[]): number =>
      userIds.reduce((n, id) => n + (voteOf(id, key) ? 1 : 0), 0),
    [voteOf],
  )

  const rowFor = useCallback(
    (userId: string): boolean[] => keys.map((k) => voteOf(userId, k)),
    [keys, voteOf],
  )

  const matrix = useCallback(
    (userIds: string[]): Record<string, boolean[]> =>
      Object.fromEntries(userIds.map((id) => [id, rowFor(id)])),
    [rowFor],
  )

  const pins = pinOverlay ?? event?.chosenOptions ?? []

  const togglePin = useCallback(
    (key: string) => {
      setPinOverlay((prev) => {
        const current = prev ?? event?.chosenOptions ?? []
        return current.includes(key) ? current.filter((k) => k !== key) : [...current, key]
      })
    },
    [event],
  )

  const savedNote = useCallback(
    (key: string): string | null => options.find((o) => optionKey(o) === key)?.note ?? null,
    [options],
  )

  const noteOf = useCallback(
    (key: string): string | null => (key in noteOverlay ? noteOverlay[key]! : savedNote(key)),
    [noteOverlay, savedNote],
  )

  // Stryker disable ArrayDeclaration: a constant dependency list is never read
  const setNote = useCallback((key: string, note: string | null) => {
    setNoteOverlay((prev) => ({ ...prev, [key]: normalizeNote(note) }))
  }, [])
  // Stryker restore ArrayDeclaration

  /** The event's options with the draft notes folded in, ready to save. */
  const optionsWithNotes = useCallback(
    (): DayOption[] => options.map((o) => ({ ...o, note: noteOf(optionKey(o)) })),
    [options, noteOf],
  )

  const dirty =
    Object.keys(votes).length > 0 || pinOverlay !== null || Object.keys(noteOverlay).length > 0

  // Stryker disable ArrayDeclaration: a constant dependency list is never read
  const reset = useCallback(() => {
    setVotes({})
    setPinOverlay(null)
    setNoteOverlay({})
  }, [])
  // Stryker restore ArrayDeclaration

  return {
    voteOf,
    setVote,
    votesFor,
    rowFor,
    matrix,
    pins,
    togglePin,
    noteOf,
    setNote,
    optionsWithNotes,
    dirty,
    reset,
  }
}
