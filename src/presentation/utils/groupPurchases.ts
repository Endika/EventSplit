import type { EventSnapshot } from '@/domain/entities/Event'
import type { PurchaseSnapshot } from '@/domain/entities/Purchase'
import { swapWithNeighbour } from '@/presentation/utils/collections'

/** A group of purchases, partitioned into subgroups. `''` = no group / no subgroup. */
export interface PurchaseGroup {
  group: string
  items: PurchaseSnapshot[]
  subgroups: { subgroup: string; items: PurchaseSnapshot[] }[]
}

/**
 * Sort keys for a grouping level: explicitly-ordered first (in `order`), then the rest
 * alphabetically, with the empty ('') bucket always last.
 */
export function sortByOrder(keys: string[], order: string[]): string[] {
  return [...keys].sort((a, b) => {
    if (a === '') return 1
    if (b === '') return -1
    const ia = order.indexOf(a)
    const ib = order.indexOf(b)
    if (ia !== -1 && ib !== -1) return ia - ib
    if (ia !== -1) return -1
    if (ib !== -1) return 1
    return a.localeCompare(b)
  })
}

/**
 * Partition purchases by group then subgroup, honoring `event.groupOrder` and
 * `event.subgroupOrder`. Single source of truth shared by the purchases tab, the share
 * text and the expense form so the three never drift.
 */
export function groupPurchases(event: EventSnapshot, items: PurchaseSnapshot[]): PurchaseGroup[] {
  const map = new Map<string, PurchaseSnapshot[]>()
  for (const p of items) {
    const key = p.group ?? ''
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(p)
  }
  // Stryker disable next-line ArrayDeclaration: an order naming no group sorts like an empty one
  const order = event.groupOrder ?? []
  const subOrders = event.subgroupOrder ?? {}
  const keys = sortByOrder([...map.keys()], order)
  return keys.map((group) => {
    const groupItems = map.get(group)!
    const subMap = new Map<string, PurchaseSnapshot[]>()
    for (const p of groupItems) {
      const sk = p.subgroup ?? ''
      if (!subMap.has(sk)) subMap.set(sk, [])
      subMap.get(sk)!.push(p)
    }
    // Stryker disable next-line ArrayDeclaration: an order naming no subgroup sorts like an empty one
    const subKeys = sortByOrder([...subMap.keys()], subOrders[group] ?? [])
    const subgroups = subKeys.map((subgroup) => ({ subgroup, items: subMap.get(subgroup)! }))
    return { group, items: groupItems, subgroups }
  })
}

/** Stable collapse key for a subgroup. NUL can't occur in trimmed user input. */
export const subCollapseKey = (group: string, subgroup: string): string =>
  `${group}\u0000${subgroup}`

/** The group order after moving `group` one step, or null when it cannot move. */
export function movedGroupOrder(
  grouped: readonly PurchaseGroup[],
  group: string,
  dir: -1 | 1,
): string[] | null {
  return swapWithNeighbour(
    grouped.map((g) => g.group).filter((g) => g !== ''),
    group,
    dir,
  )
}

/** The subgroup order of `group` after moving `subgroup` one step, or null when it cannot move. */
export function movedSubgroupOrder(
  grouped: readonly PurchaseGroup[],
  group: string,
  subgroup: string,
  dir: -1 | 1,
): string[] | null {
  const entry = grouped.find((g) => g.group === group)
  if (!entry) return null
  return swapWithNeighbour(
    entry.subgroups.map((s) => s.subgroup).filter((s) => s !== ''),
    subgroup,
    dir,
  )
}
