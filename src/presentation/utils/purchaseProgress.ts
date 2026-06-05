import type { EventSnapshot } from '@/domain/entities/Event'
import type { PurchaseSnapshot } from '@/domain/entities/Purchase'

interface ExcludeOpts {
  /** Skip this expense when summing — used by the edit form to ignore the expense being edited. */
  excludeExpenseId?: string
}

/** Total quantity bought for a purchase, summed across non-deleted linked expenses. */
export function boughtQuantity(
  event: EventSnapshot,
  purchaseId: string,
  opts: ExcludeOpts = {},
): number {
  return event.expenses
    .filter((e) => !e.deleted && e.id !== opts.excludeExpenseId)
    .reduce(
      (sum, e) =>
        sum + ((e.purchaseLinks ?? []).find((l) => l.purchaseId === purchaseId)?.quantity ?? 0),
      0,
    )
}

/** Whether any non-deleted expense links this purchase. */
export function hasLinkedExpense(
  event: EventSnapshot,
  purchaseId: string,
  opts: ExcludeOpts = {},
): boolean {
  return event.expenses.some(
    (e) =>
      !e.deleted &&
      e.id !== opts.excludeExpenseId &&
      (e.purchaseLinks ?? []).some((l) => l.purchaseId === purchaseId),
  )
}

/**
 * Single source of truth for "comprado": the manual purchased flag OR full coverage by
 * linked expenses. Derived, never persisted — editing/deleting the expense recomputes it.
 * `bring` items are never considered bought through expenses.
 */
export function isPurchaseDone(
  event: EventSnapshot,
  p: PurchaseSnapshot,
  opts: ExcludeOpts = {},
): boolean {
  if (p.purchased) return true
  if (p.kind === 'bring') return false
  return hasLinkedExpense(event, p.id, opts) && boughtQuantity(event, p.id, opts) >= p.totalQuantity
}

/** Units still missing to reach totalQuantity, floored at 0 (never the misleading 1). */
export function remainingToBuy(
  event: EventSnapshot,
  p: PurchaseSnapshot,
  opts: ExcludeOpts = {},
): number {
  return Math.max(0, p.totalQuantity - boughtQuantity(event, p.id, opts))
}
