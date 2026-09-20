import type { UserKind } from '@/domain/entities/User'

/**
 * What each participant kind is allowed to do. Kept in one place because the
 * same `kind === 'adult'` check used to stand for two unrelated rules — "a dog
 * pays nothing" and "a child doesn't do the shopping" — so changing one of them
 * silently changed the other.
 */

/** Dogs attend, dogs don't pay: they never enter an expense split. */
export const paysExpenses = (kind: UserKind): boolean => kind !== 'dog'

/** Availability votes come from people. */
export const canVote = (kind: UserKind): boolean => kind !== 'dog'

/** Only adults can be the buyer of a purchase or the payer of an expense. */
export const canBeAssigned = (kind: UserKind): boolean => kind === 'adult'

/** Nobody identifies themselves as the dog when joining an event. */
export const isSelectableAsSelf = (kind: UserKind): boolean => kind !== 'dog'

/** Default share of a purchase's quantity, before the user edits it. */
export const defaultMultiplier = (kind: UserKind): number => (kind === 'child' ? 0.5 : 1)

/** Preselected as consumers when a purchase is created. Dogs are opted in by hand. */
export const isDefaultConsumer = (kind: UserKind): boolean => kind !== 'dog'

export const payingUsers = <T extends { kind: UserKind }>(users: readonly T[]): T[] =>
  users.filter((u) => paysExpenses(u.kind))
