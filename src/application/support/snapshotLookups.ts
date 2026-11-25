import type { EventSnapshot } from '@/domain/entities/Event'

export function assertMember(snapshot: EventSnapshot, userId: string, role: string): void {
  if (!snapshot.users.some((u) => u.id === userId))
    throw new Error(`${role} ${userId} not in event`)
}

export function memberName(snapshot: EventSnapshot, userId: string): string {
  return snapshot.users.find((u) => u.id === userId)?.name ?? 'Someone'
}

export function requireById<T extends { id: string }>(
  items: readonly T[],
  id: string,
  label: string,
): T {
  const found = items.find((item) => item.id === id)
  if (!found) throw new Error(`${label} ${id} not found`)
  return found
}

export function replaceById<T extends { id: string }>(
  items: readonly T[],
  id: string,
  next: T,
): T[] {
  return items.map((item) => (item.id === id ? next : item))
}

export function assertLivePurchases(
  snapshot: EventSnapshot,
  links: readonly { purchaseId: string }[],
): void {
  const live = new Set(snapshot.purchases.filter((p) => !p.deleted).map((p) => p.id))
  for (const link of links) {
    if (!live.has(link.purchaseId)) throw new Error(`Link purchase ${link.purchaseId} not found`)
  }
}
