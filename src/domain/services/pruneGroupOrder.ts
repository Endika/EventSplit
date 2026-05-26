import type { PurchaseSnapshot } from '@/domain/entities/Purchase'

/**
 * Keep only group names that still have at least one non-deleted purchase.
 * Drops stale entries left behind when a group's last item is deleted or moved.
 */
export function pruneGroupOrder(
  purchases: PurchaseSnapshot[],
  groupOrder: string[],
): string[] {
  const active = new Set(
    purchases.filter((p) => !p.deleted && p.group).map((p) => p.group as string),
  )
  return groupOrder.filter((g) => active.has(g))
}
