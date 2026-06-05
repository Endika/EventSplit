import type { EventSnapshot } from '@/domain/entities/Event'
import type { PurchaseSnapshot } from '@/domain/entities/Purchase'

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
    const subKeys = sortByOrder([...subMap.keys()], subOrders[group] ?? [])
    const subgroups = subKeys.map((subgroup) => ({ subgroup, items: subMap.get(subgroup)! }))
    return { group, items: groupItems, subgroups }
  })
}
