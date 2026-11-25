import type { EventSnapshot } from '@/domain/entities/Event'
import type { UserSnapshot } from '@/domain/entities/User'
import { optionKey, type DayOption } from '@/domain/value-objects/DayOption'
import { canVote } from '@/domain/services/participantRoles'

/** The users a vote table shows: adults, plus the other people when children are switched on. */
export const matrixVoters = (
  users: readonly UserSnapshot[],
  showChildren: boolean,
): UserSnapshot[] => users.filter((u) => (showChildren ? canVote(u.kind) : u.kind === 'adult'))

/** Saved votes per option, from everyone who may hold one. */
export function savedVotesByKey(
  event: Pick<EventSnapshot, 'dayOptions' | 'users' | 'availability'>,
): Record<string, number> {
  return byKey(event.dayOptions, (_, i) =>
    event.users.reduce((n, u) => n + (canVote(u.kind) && event.availability[u.id]?.[i] ? 1 : 0), 0),
  )
}

/** One entry per option, keyed by its dates. */
export const byKey = <T>(
  options: readonly DayOption[],
  valueOf: (key: string, index: number) => T,
): Record<string, T> =>
  Object.fromEntries(options.map((o, i) => [optionKey(o), valueOf(optionKey(o), i)]))

/** Options nobody voted for yet: removing them costs nobody a vote. */
export const removableKeys = (
  options: readonly DayOption[],
  votes: Record<string, number>,
): string[] => options.map(optionKey).filter((key) => votes[key] === 0)

export const pinsChanged = (pins: readonly string[], chosen: readonly string[]): boolean =>
  pins.length !== chosen.length || pins.some((k) => !chosen.includes(k))

export const notesChanged = (
  options: readonly DayOption[],
  noteOf: (key: string) => string | null,
): boolean => options.some((o) => o.note !== noteOf(optionKey(o)))

/** The saved option for a key, or a single-day stand-in for a key that is gone. */
export const optionOfKey = (options: readonly DayOption[], key: string): DayOption =>
  options.find((o) => optionKey(o) === key) ?? {
    start: key.slice(0, 10),
    end: key.slice(0, 10),
    note: null,
  }
