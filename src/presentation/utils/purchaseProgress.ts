import type { EventSnapshot } from '@/domain/entities/Event'
import type { PurchaseSnapshot } from '@/domain/entities/Purchase'

interface ExcludeOpts {
  /** Skip this expense when summing — used by the edit form to ignore the expense being edited. */
  excludeExpenseId?: string
}

type Linked = EventSnapshot['expenses'][number]

// Stryker disable next-line ArrayDeclaration: a stray element never matches a purchase id
const linksOf = (e: Linked) => e.purchaseLinks ?? []

/** Total quantity bought for a purchase, summed across non-deleted linked expenses. */
export function boughtQuantity(
  event: EventSnapshot,
  purchaseId: string,
  opts: ExcludeOpts = {},
): number {
  return event.expenses
    .filter((e) => !e.deleted && e.id !== opts.excludeExpenseId)
    .reduce((sum, e) => sum + linkedQuantity(e, purchaseId), 0)
}

const linkedQuantity = (e: Linked, purchaseId: string): number =>
  linksOf(e).find((l) => l.purchaseId === purchaseId)?.quantity ?? 0

/** The non-deleted expenses that link this purchase. */
export function linkedExpenses(
  event: EventSnapshot,
  purchaseId: string,
  opts: ExcludeOpts = {},
): EventSnapshot['expenses'] {
  return event.expenses.filter(
    (e) =>
      !e.deleted &&
      e.id !== opts.excludeExpenseId &&
      linksOf(e).some((l) => l.purchaseId === purchaseId),
  )
}

/** Whether any non-deleted expense links this purchase. */
export function hasLinkedExpense(
  event: EventSnapshot,
  purchaseId: string,
  opts: ExcludeOpts = {},
): boolean {
  return linkedExpenses(event, purchaseId, opts).length > 0
}

/** Who paid for this purchase, once each, in the order the expenses appear. */
export function buyerIds(event: EventSnapshot, purchaseId: string): string[] {
  return [...new Set(linkedExpenses(event, purchaseId).map((e) => e.paidBy))]
}

/** How much of the total is covered, as a bar width; a zero total reads as full. */
export function progressPercent(bought: number, total: number): number {
  return total > 0 ? Math.min(100, (bought / total) * 100) : 100
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
