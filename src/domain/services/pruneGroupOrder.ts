import type { PurchaseSnapshot } from '@/domain/entities/Purchase'

/**
 * Keep only group names that still have at least one non-deleted purchase.
 * Drops stale entries left behind when a group's last item is deleted or moved.
 */
export function pruneGroupOrder(purchases: PurchaseSnapshot[], groupOrder: string[]): string[] {
  const active = new Set(
    purchases.filter((p) => !p.deleted && p.group).map((p) => p.group as string),
  )
  return groupOrder.filter((g) => active.has(g))
}

/**
 * Reconcile the saved subgroup order with the live purchases: keep the saved
 * order (dropping subgroups whose last non-deleted purchase is gone) and append
 * any subgroup an item references that the order doesn't list yet. This keeps
 * subgroupOrder a faithful, self-healing reflection of the items — a subgroup
 * assigned on a purchase always surfaces, and stale/empty ones go. Mirrors
 * pruneGroupOrder, one level down.
 */
export function pruneSubgroupOrder(
  purchases: PurchaseSnapshot[],
  subgroupOrder: Record<string, string[]>,
): Record<string, string[]> {
  // active.get(group) → subgroups (insertion-ordered) that still have a live purchase
  const active = new Map<string, Set<string>>()
  for (const p of purchases) {
    if (p.deleted || !p.group || !p.subgroup) continue
    if (!active.has(p.group)) active.set(p.group, new Set())
    active.get(p.group)!.add(p.subgroup)
  }
  const result: Record<string, string[]> = {}
  for (const [group, liveSubs] of active) {
    const saved = subgroupOrder[group] ?? []
    const kept = saved.filter((s) => liveSubs.has(s))
    const appended = [...liveSubs].filter((s) => !kept.includes(s))
    result[group] = [...kept, ...appended]
  }
  return result
}
