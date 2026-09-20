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

/** A child can carry the crisps; a dog cannot be put in charge of an item. */
export const canBring = (kind: UserKind): boolean => kind !== 'dog'

/** Nobody identifies themselves as the dog when joining an event. */
export const isSelectableAsSelf = (kind: UserKind): boolean => kind !== 'dog'

/** Default share of a purchase's quantity, before the user edits it. */
export const defaultMultiplier = (kind: UserKind): number => (kind === 'child' ? 0.5 : 1)

/** Preselected as consumers when a purchase is created. Dogs are opted in by hand. */
export const isDefaultConsumer = (kind: UserKind): boolean => kind !== 'dog'

export const payingUsers = <T extends { kind: UserKind }>(users: readonly T[]): T[] =>
  users.filter((u) => paysExpenses(u.kind))

/**
 * A participant who already put money in cannot be turned into a dog: dogs are
 * absent from every balance, so the expense they paid would stop being credited
 * to anybody and the balances would quietly stop summing to zero.
 */
/** Only an adult of the event can be answerable for a child. */
export const canBeGuardian = (kind: UserKind): boolean => kind === 'adult'

/**
 * An adult with children in their charge cannot stop being an adult: the
 * children would be left pointing at somebody who can no longer carry them.
 */
export const hasDependants = (
  userId: string,
  users: readonly { id: string; guardianId: string | null }[],
): boolean => users.some((u) => u.guardianId === userId)

export const canBecome = (
  kind: UserKind,
  spending: { expenses: readonly { paidBy: string; deleted: boolean }[]; userId: string },
): boolean =>
  paysExpenses(kind) || !spending.expenses.some((e) => !e.deleted && e.paidBy === spending.userId)
