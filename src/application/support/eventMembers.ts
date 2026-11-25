import type { EventSnapshot } from '@/domain/entities/Event'

export function assertMember(snapshot: EventSnapshot, userId: string, role: string): void {
  if (!snapshot.users.some((u) => u.id === userId))
    throw new Error(`${role} ${userId} not in event`)
}

export function memberName(snapshot: EventSnapshot, userId: string): string {
  return snapshot.users.find((u) => u.id === userId)?.name ?? 'Someone'
}
