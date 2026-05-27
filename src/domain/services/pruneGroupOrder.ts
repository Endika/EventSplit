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

/**
 * Keep only subgroup names that still have at least one non-deleted purchase in
 * their group. Drops stale subgroups and group keys left empty after a move or
 * delete, keeping the snapshot consistent. Mirrors pruneGroupOrder, one level down.
 */
export function pruneSubgroupOrder(
  purchases: PurchaseSnapshot[],
  subgroupOrder: Record<string, string[]>,
): Record<string, string[]> {
  // active.get(group) → set of subgroups that still have a live purchase in that group
  const active = new Map<string, Set<string>>()
  for (const p of purchases) {
    if (p.deleted || !p.group || !p.subgroup) continue
    if (!active.has(p.group)) active.set(p.group, new Set())
    active.get(p.group)!.add(p.subgroup)
  }
  const result: Record<string, string[]> = {}
  for (const [group, subgroups] of Object.entries(subgroupOrder)) {
    const liveSubs = active.get(group)
    if (!liveSubs) continue
    const kept = subgroups.filter((s) => liveSubs.has(s))
    if (kept.length > 0) result[group] = kept
  }
  return result
}
