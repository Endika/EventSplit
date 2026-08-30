import type { EventSnapshot } from '@/domain/entities/Event'
import type { PurchaseSnapshot } from '@/domain/entities/Purchase'
import { optionKey, spanDays } from '@/domain/value-objects/DayOption'

/** Fallback when the stored numbers cannot tell us anything (a weekend trip). */
export const DEFAULT_CONSUMPTION_DAYS = 2

/**
 * How many days of consumption a saved purchase was sized for. The days are not
 * stored — `totalQuantity` is — so we read them back out of it. Used by the
 * purchase form to prefill, and by cloning to resize an item for its new group.
 */
export function inferPurchaseDays(purchase: PurchaseSnapshot): number {
  const sumMultipliers = purchase.consumers.reduce((s, c) => s + c.multiplier, 0)
  const totalDaily = purchase.dailyConsumption * sumMultipliers
  if (totalDaily <= 0) return DEFAULT_CONSUMPTION_DAYS
  const days = Math.round(purchase.totalQuantity / totalDaily)
  return days > 0 ? days : DEFAULT_CONSUMPTION_DAYS
}

/**
 * How many days to prefill for a *new* purchase: the length of the day the group
 * settled on. Several options pinned means no single answer yet, so take the
 * longest — running short is worse than a spare bottle, and the field stays
 * editable because a given item may only be for one day of the trip.
 *
 * Nothing pinned yet: no way to know the length, so keep the old default.
 */
export function defaultConsumptionDays(
  event: Pick<EventSnapshot, 'dayOptions' | 'chosenOptions'> | null,
): number {
  if (!event) return DEFAULT_CONSUMPTION_DAYS
  const pinned = event.dayOptions.filter((o) => event.chosenOptions.includes(optionKey(o)))
  if (pinned.length === 0) return DEFAULT_CONSUMPTION_DAYS
  return Math.max(...pinned.map(spanDays))
}
