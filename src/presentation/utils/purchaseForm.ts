import type { PurchaseSnapshot } from '@/domain/entities/Purchase'
import type { UserKind } from '@/domain/entities/User'
import { defaultMultiplier, isDefaultConsumer } from '@/domain/services/participantRoles'
import { live } from '@/presentation/utils/collections'
import { isPositiveNumber, round2 } from '@/presentation/utils/numbers'

type Consumers = Record<string, number>

const distinctSorted = (values: (string | null)[]): string[] =>
  [...new Set(values.filter((v): v is string => !!v))].sort()

export const existingGroups = (purchases: readonly PurchaseSnapshot[]): string[] =>
  distinctSorted(live(purchases).map((p) => p.group))

export const existingSubgroups = (
  purchases: readonly PurchaseSnapshot[],
  group: string,
): string[] =>
  distinctSorted(
    live(purchases)
      .filter((p) => p.group === group)
      .map((p) => p.subgroup),
  )

/**
 * Editing keeps the saved consumers. A new purchase pre-selects everyone at their
 * default multiplier; dogs eat dog food, not the shopping list, but can be ticked by hand.
 */
export function initialConsumers(
  users: readonly { id: string; kind: UserKind }[],
  purchase?: { consumers: readonly { userId: string; multiplier: number }[] },
): Consumers {
  if (purchase) return Object.fromEntries(purchase.consumers.map((c) => [c.userId, c.multiplier]))
  return Object.fromEntries(
    users.filter((u) => isDefaultConsumer(u.kind)).map((u) => [u.id, defaultMultiplier(u.kind)]),
  )
}

export const allConsumers = (users: readonly { id: string; kind: UserKind }[]): Consumers =>
  Object.fromEntries(users.map((u) => [u.id, defaultMultiplier(u.kind)]))

export function toggleConsumer(
  consumers: Consumers,
  id: string,
  users: readonly { id: string; kind: UserKind }[],
): Consumers {
  const copy = { ...consumers }
  if (copy[id] !== undefined) {
    delete copy[id]
  } else {
    const user = users.find((u) => u.id === id)
    copy[id] = user ? defaultMultiplier(user.kind) : 1
  }
  return copy
}

/** The group is trimmed and blank means none; a subgroup only exists inside a group. */
export function groupFields(
  group: string,
  subgroup: string,
): { group: string | null; subgroup: string | null } {
  const g = group.trim()
  return { group: g || null, subgroup: g ? subgroup.trim() || null : null }
}

/** A shared staple is eaten by everyone but dogs, once each. */
export function buyConsumers(
  isSingle: boolean,
  users: readonly { id: string; kind: UserKind }[],
  consumers: Consumers,
): { userId: string; multiplier: number }[] {
  return isSingle
    ? users.filter((u) => isDefaultConsumer(u.kind)).map((u) => ({ userId: u.id, multiplier: 1 }))
    : Object.entries(consumers).map(([userId, multiplier]) => ({ userId, multiplier }))
}

export const isValidConsumption = (daily: number, days: number): boolean =>
  isPositiveNumber(daily) && Number.isInteger(days) && days > 0

/** Total the consumers will eat, rounded for display; null when it is not a positive number. */
export function totalPreview(consumers: Consumers, daily: number, days: number): number | null {
  const totalDaily = Object.values(consumers).reduce((sum, mul) => sum + daily * mul, 0)
  const total = totalDaily * days
  return isPositiveNumber(total) ? round2(total) : null
}

export function allergenLabel(
  a: { name: string; notes: string | null },
  translatedName: string,
): string {
  if (a.name === 'other') return a.notes || translatedName
  return a.notes ? `${translatedName} (${a.notes})` : translatedName
}

export function isSubmitBlocked(f: {
  busy: boolean
  online: boolean
  isEdit: boolean
  item: string
  mode: 'buy' | 'bring'
  isSingle: boolean
  consumerCount: number
}): boolean {
  return (
    f.busy ||
    !f.online ||
    (!f.isEdit && !f.item) ||
    (f.mode === 'buy' && !f.isSingle && f.consumerCount === 0)
  )
}
