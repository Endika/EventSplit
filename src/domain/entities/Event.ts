import { EventId } from '@/domain/value-objects/EventId'
import { User } from '@/domain/entities/User'
import type { UserSnapshot } from '@/domain/entities/User'
import type { PurchaseSnapshot } from '@/domain/entities/Purchase'
import type { ExpenseSnapshot } from '@/domain/entities/Expense'

export const EVENT_STAGES = ['doodle', 'shopping', 'expenses'] as const
export type EventStage = (typeof EVENT_STAGES)[number]

export type HistoryType =
  | 'event_created'
  | 'user_joined'
  | 'user_removed'
  | 'purchase_added'
  | 'purchase_edited'
  | 'purchase_deleted'
  | 'purchase_recovered'
  | 'expense_added'
  | 'expense_edited'
  | 'expense_deleted'
  | 'expense_recovered'
  | 'availability_voted'
  | 'location_set'
  | 'notes_added'
  | 'days_set'
  | 'user_profile_updated'
  | 'edit_pin_set'
  | 'edit_pin_cleared'
  | 'stage_changed'
  | 'settlement_toggled'

export interface HistoryEntry {
  id: string
  version: number
  timestamp: string
  type: HistoryType
  userId: string
  description: string
}

export const MAX_HISTORY_ENTRIES = 30

/** Keep only the most recent entries; history is an informational audit log. */
export function capHistory(entries: HistoryEntry[]): HistoryEntry[] {
  return entries.length > MAX_HISTORY_ENTRIES ? entries.slice(-MAX_HISTORY_ENTRIES) : entries
}

/**
 * Max soft-deleted items kept per list (purchases, expenses). The trash never
 * empties on its own and rides along in every Realtime payload, so it is the
 * last unbounded growth vector in the snapshot — cap it low.
 */
export const MAX_TRASH_ENTRIES = 5

export interface EventLocation {
  name: string
  address: string | null
  lat: number | null
  lng: number | null
  postalCode: string | null
  googleMapsUrl: string | null
}

export interface EventSnapshot {
  id: string
  name: string
  createdBy: string
  description: string | null
  location: EventLocation | null
  generalNotes: string | null
  wifiPassword: string | null
  emergencyContact: string | null
  users: UserSnapshot[]
  availability: Record<string, boolean[]>
  availabilityNote: string | null
  chosenDay: string | null
  days: string[]
  purchases: PurchaseSnapshot[]
  groupOrder: string[]
  subgroupOrder: Record<string, string[]>
  expenses: ExpenseSnapshot[]
  editPin: string | null
  stage: EventStage
  settledTransfers: { from: string; to: string }[]
  history: HistoryEntry[]
  createdAt: string
  updatedAt: string
}

export class Event {
  private readonly s: EventSnapshot

  private constructor(
    readonly id: EventId,
    snapshot: EventSnapshot,
  ) {
    this.s = { ...snapshot, history: capHistory(snapshot.history) }
  }

  static create(input: { name: string; creator: User; id?: EventId }): Event {
    const name = input.name.trim()
    if (name.length < 3 || name.length > 100) throw new Error('Event: name must be 3..100 chars')
    const id = input.id ?? EventId.generate()
    const now = new Date().toISOString()
    const snapshot: EventSnapshot = {
      id: id.value,
      name,
      createdBy: input.creator.id.value,
      description: null,
      location: null,
      generalNotes: null,
      wifiPassword: null,
      emergencyContact: null,
      users: [input.creator.toSnapshot()],
      availability: {},
      availabilityNote: null,
      chosenDay: null,
      days: [],
      purchases: [],
      groupOrder: [],
      subgroupOrder: {},
      expenses: [],
      editPin: null,
      stage: 'doodle',
      settledTransfers: [],
      history: [
        {
          id: crypto.randomUUID(),
          version: 1,
          timestamp: now,
          type: 'event_created',
          userId: input.creator.id.value,
          description: `Event created: ${name}`,
        },
      ],
      createdAt: now,
      updatedAt: now,
    }
    return new Event(id, snapshot)
  }

  static restore(s: EventSnapshot): Event {
    // Backfill optional fields that may be missing from older snapshots
    // (events created before Slice 2 / Slice 3 added these fields).
    const backfilled: EventSnapshot = {
      ...s,
      description: s.description ?? null,
      location: s.location ?? null,
      generalNotes: s.generalNotes ?? null,
      wifiPassword: s.wifiPassword ?? null,
      emergencyContact: s.emergencyContact ?? null,
      days: s.days ?? [],
      availability: s.availability ?? {},
      availabilityNote: s.availabilityNote ?? null,
      chosenDay: s.chosenDay ?? null,
      purchases: (s.purchases ?? []).map((p) => {
        const purchased = (p as { purchased?: boolean }).purchased ?? false
        return {
          ...p,
          assignedTo: (p as { assignedTo?: string | null }).assignedTo ?? null,
          purchased,
          boughtQuantity:
            (p as { boughtQuantity?: number }).boughtQuantity ?? (purchased ? p.totalQuantity : 0),
          group: p.group ?? null,
          subgroup: p.subgroup ?? null,
        }
      }),
      groupOrder: s.groupOrder ?? [],
      subgroupOrder: s.subgroupOrder ?? {},
      expenses: (s.expenses ?? []).map((e) => ({
        ...e,
        splitAmong: e.splitAmong ?? [],
        deleted: e.deleted ?? false,
        deletedBy: e.deletedBy ?? null,
        deletedAt: e.deletedAt ?? null,
      })),
      history: s.history ?? [],
      editPin: s.editPin ?? null,
      stage: s.stage ?? 'doodle',
      settledTransfers: s.settledTransfers ?? [],
      users: (s.users ?? []).map((u) => ({
        ...u,
        alias: u.alias ?? null,
        email: u.email ?? null,
        phone: u.phone ?? null,
        allergies: u.allergies ?? [],
        dietary: u.dietary ?? null,
        notes: u.notes ?? null,
        kind: u.kind ?? 'adult',
      })),
    }
    return new Event(EventId.of(s.id), backfilled)
  }

  addUser(user: User): Event {
    if (this.s.users.some((u) => u.id === user.id.value))
      throw new Error('Event: user already in event')
    const now = new Date().toISOString()
    const nextVersion = (this.s.history.at(-1)?.version ?? 0) + 1
    const nextSnapshot: EventSnapshot = {
      ...this.s,
      users: [...this.s.users, user.toSnapshot()],
      updatedAt: now,
      history: [
        ...this.s.history,
        {
          id: crypto.randomUUID(),
          version: nextVersion,
          timestamp: now,
          type: 'user_joined',
          userId: user.id.value,
          description: `${user.displayName} joined`,
        },
      ],
    }
    return new Event(this.id, nextSnapshot)
  }

  removeUser(userId: string): Event {
    if (this.s.createdBy === userId) throw new Error('Event: cannot remove the event creator')
    if (!this.s.users.some((u) => u.id === userId)) throw new Error('Event: user not in event')

    // Hard rules: refuse if user has expenses paid or non-deleted purchases created
    const hasExpenses = this.s.expenses.some((e) => e.paidBy === userId && !e.deleted)
    if (hasExpenses)
      throw new Error(
        'Event: cannot remove user who paid for expenses (delete those expenses first)',
      )

    const hasOwnedPurchases = this.s.purchases.some((p) => p.createdBy === userId && !p.deleted)
    if (hasOwnedPurchases)
      throw new Error(
        'Event: cannot remove user who created purchases (delete those purchases first)',
      )

    const now = new Date().toISOString()
    const nextVersion = (this.s.history.at(-1)?.version ?? 0) + 1

    // Clean up: remove from availability map
    const newAvailability = { ...this.s.availability }
    delete newAvailability[userId]

    // Clean up: remove from each purchase's consumers list, and clear any
    // assignment to the removed user so it doesn't dangle.
    const newPurchases = this.s.purchases.map((p) => ({
      ...p,
      consumers: p.consumers.filter((c) => c.userId !== userId),
      assignedTo: p.assignedTo === userId ? null : p.assignedTo,
    }))

    // Clean up: remove from each expense's splitAmong list
    const newExpenses = this.s.expenses.map((e) => ({
      ...e,
      splitAmong: e.splitAmong.filter((id) => id !== userId),
    }))

    const removedUser = this.s.users.find((u) => u.id === userId)!
    const removedDisplayName = removedUser.alias
      ? `${removedUser.name} (${removedUser.alias})`
      : removedUser.name

    const nextSnapshot: EventSnapshot = {
      ...this.s,
      users: this.s.users.filter((u) => u.id !== userId),
      availability: newAvailability,
      purchases: newPurchases,
      expenses: newExpenses,
      settledTransfers: this.s.settledTransfers.filter((s) => s.from !== userId && s.to !== userId),
      updatedAt: now,
      history: [
        ...this.s.history,
        {
          id: crypto.randomUUID(),
          version: nextVersion,
          timestamp: now,
          type: 'user_removed',
          userId,
          description: `${removedDisplayName} was removed from the event`,
        },
      ],
    }

    return new Event(this.id, nextSnapshot)
  }

  setStage(input: { stage: EventStage; userId: string }): Event {
    if (!EVENT_STAGES.includes(input.stage))
      throw new Error(`Event: invalid stage "${input.stage}"`)
    if (!this.s.users.some((u) => u.id === input.userId))
      throw new Error('Event: user not in event')
    if (this.s.stage === input.stage) {
      // No-op — return same event without bumping version/history
      return this
    }

    const now = new Date().toISOString()
    const nextVersion = (this.s.history.at(-1)?.version ?? 0) + 1
    const userName = this.s.users.find((u) => u.id === input.userId)?.name ?? 'Someone'

    const nextSnapshot: EventSnapshot = {
      ...this.s,
      stage: input.stage,
      updatedAt: now,
      history: [
        ...this.s.history,
        {
          id: crypto.randomUUID(),
          version: nextVersion,
          timestamp: now,
          type: 'stage_changed',
          userId: input.userId,
          description: `${userName} moved to ${input.stage} stage`,
        },
      ],
    }

    return new Event(this.id, nextSnapshot)
  }

  setAvailabilityMeta(input: {
    userId: string
    note: string | null
    chosenDay: string | null
  }): Event {
    if (!this.s.users.some((u) => u.id === input.userId))
      throw new Error('Event: user not in event')
    if (input.chosenDay !== null && !this.s.days.includes(input.chosenDay))
      throw new Error('Event: chosenDay must be one of the event days')
    const note = input.note?.trim() ? input.note.trim().slice(0, 200) : null
    const now = new Date().toISOString()
    const nextVersion = (this.s.history.at(-1)?.version ?? 0) + 1
    const userName = this.s.users.find((u) => u.id === input.userId)?.name ?? 'Someone'
    const nextSnapshot: EventSnapshot = {
      ...this.s,
      availabilityNote: note,
      chosenDay: input.chosenDay,
      updatedAt: now,
      history: [
        ...this.s.history,
        {
          id: crypto.randomUUID(),
          version: nextVersion,
          timestamp: now,
          type: 'availability_voted',
          userId: input.userId,
          description: `${userName} updated availability details`,
        },
      ],
    }
    return new Event(this.id, nextSnapshot)
  }

  toggleSettlement(input: { userId: string; from: string; to: string }): Event {
    if (!this.s.users.some((u) => u.id === input.userId))
      throw new Error('Event: user not in event')
    const exists = this.s.settledTransfers.some((s) => s.from === input.from && s.to === input.to)
    const nextSettled = exists
      ? this.s.settledTransfers.filter((s) => !(s.from === input.from && s.to === input.to))
      : [...this.s.settledTransfers, { from: input.from, to: input.to }]
    const now = new Date().toISOString()
    const nextVersion = (this.s.history.at(-1)?.version ?? 0) + 1
    const userName = this.s.users.find((u) => u.id === input.userId)?.name ?? 'Someone'
    const fromName = this.s.users.find((u) => u.id === input.from)?.name ?? '?'
    const toName = this.s.users.find((u) => u.id === input.to)?.name ?? '?'
    const nextSnapshot: EventSnapshot = {
      ...this.s,
      settledTransfers: nextSettled,
      updatedAt: now,
      history: [
        ...this.s.history,
        {
          id: crypto.randomUUID(),
          version: nextVersion,
          timestamp: now,
          type: 'settlement_toggled',
          userId: input.userId,
          description: exists
            ? `${userName} marked ${fromName}→${toName} as unpaid`
            : `${userName} marked ${fromName}→${toName} as paid`,
        },
      ],
    }
    return new Event(this.id, nextSnapshot)
  }

  renameGroup(input: { userId: string; from: string; to: string }): Event {
    if (!this.s.users.some((u) => u.id === input.userId))
      throw new Error('Event: user not in event')
    const to = input.to.trim().slice(0, 50)
    const toValue = to === '' ? null : to
    const now = new Date().toISOString()
    const nextVersion = (this.s.history.at(-1)?.version ?? 0) + 1
    const userName = this.s.users.find((u) => u.id === input.userId)?.name ?? 'Someone'
    const purchases = this.s.purchases.map((p) =>
      p.group === input.from ? { ...p, group: toValue } : p,
    )
    // update groupOrder: replace 'from' with the new name (or drop if cleared/duplicate)
    const groupOrder = this.s.groupOrder
      .map((g) => (g === input.from ? (toValue ?? '') : g))
      .filter((g) => g !== '')
    const dedupedOrder = [...new Set(groupOrder)]
    // carry the renamed group's subgroup order under its new name (drop if cleared)
    const subgroupOrder = { ...this.s.subgroupOrder }
    if (input.from in subgroupOrder) {
      const moved = subgroupOrder[input.from]!
      delete subgroupOrder[input.from]
      if (toValue !== null) subgroupOrder[toValue] = moved
    }
    const nextSnapshot: EventSnapshot = {
      ...this.s,
      purchases,
      groupOrder: dedupedOrder,
      subgroupOrder,
      updatedAt: now,
      history: [
        ...this.s.history,
        {
          id: crypto.randomUUID(),
          version: nextVersion,
          timestamp: now,
          type: 'purchase_edited',
          userId: input.userId,
          description: `${userName} renamed group "${input.from}" to "${toValue ?? '—'}"`,
        },
      ],
    }
    return new Event(this.id, nextSnapshot)
  }

  setGroupOrder(input: { userId: string; order: string[] }): Event {
    if (!this.s.users.some((u) => u.id === input.userId))
      throw new Error('Event: user not in event')
    const order = [...new Set(input.order.filter((g) => g.trim() !== ''))]
    const now = new Date().toISOString()
    const nextVersion = (this.s.history.at(-1)?.version ?? 0) + 1
    const userName = this.s.users.find((u) => u.id === input.userId)?.name ?? 'Someone'
    const nextSnapshot: EventSnapshot = {
      ...this.s,
      groupOrder: order,
      updatedAt: now,
      history: [
        ...this.s.history,
        {
          id: crypto.randomUUID(),
          version: nextVersion,
          timestamp: now,
          type: 'purchase_edited',
          userId: input.userId,
          description: `${userName} reordered the shopping groups`,
        },
      ],
    }
    return new Event(this.id, nextSnapshot)
  }

  renameSubgroup(input: { userId: string; group: string; from: string; to: string }): Event {
    if (!this.s.users.some((u) => u.id === input.userId))
      throw new Error('Event: user not in event')
    const to = input.to.trim().slice(0, 50)
    const toValue = to === '' ? null : to
    const now = new Date().toISOString()
    const nextVersion = (this.s.history.at(-1)?.version ?? 0) + 1
    const userName = this.s.users.find((u) => u.id === input.userId)?.name ?? 'Someone'
    const purchases = this.s.purchases.map((p) =>
      p.group === input.group && p.subgroup === input.from ? { ...p, subgroup: toValue } : p,
    )
    // update this group's subgroup order: replace 'from' (or drop if cleared/duplicate)
    const current = this.s.subgroupOrder[input.group] ?? []
    const remapped = current
      .map((s) => (s === input.from ? (toValue ?? '') : s))
      .filter((s) => s !== '')
    const subgroupOrder = { ...this.s.subgroupOrder, [input.group]: [...new Set(remapped)] }
    const nextSnapshot: EventSnapshot = {
      ...this.s,
      purchases,
      subgroupOrder,
      updatedAt: now,
      history: [
        ...this.s.history,
        {
          id: crypto.randomUUID(),
          version: nextVersion,
          timestamp: now,
          type: 'purchase_edited',
          userId: input.userId,
          description: `${userName} renamed subgroup "${input.from}" to "${toValue ?? '—'}" in group "${input.group}"`,
        },
      ],
    }
    return new Event(this.id, nextSnapshot)
  }

  setSubgroupOrder(input: { userId: string; group: string; order: string[] }): Event {
    if (!this.s.users.some((u) => u.id === input.userId))
      throw new Error('Event: user not in event')
    const order = [...new Set(input.order.filter((s) => s.trim() !== ''))]
    const now = new Date().toISOString()
    const nextVersion = (this.s.history.at(-1)?.version ?? 0) + 1
    const userName = this.s.users.find((u) => u.id === input.userId)?.name ?? 'Someone'
    const subgroupOrder = { ...this.s.subgroupOrder, [input.group]: order }
    const nextSnapshot: EventSnapshot = {
      ...this.s,
      subgroupOrder,
      updatedAt: now,
      history: [
        ...this.s.history,
        {
          id: crypto.randomUUID(),
          version: nextVersion,
          timestamp: now,
          type: 'purchase_edited',
          userId: input.userId,
          description: `${userName} reordered subgroups in group "${input.group}"`,
        },
      ],
    }
    return new Event(this.id, nextSnapshot)
  }

  get name(): string {
    return this.s.name
  }
  get users(): UserSnapshot[] {
    return this.s.users
  }

  toSnapshot(): EventSnapshot {
    return {
      ...this.s,
      users: this.s.users.map((u) => ({ ...u })),
      purchases: this.s.purchases.map((p) => ({ ...p, consumers: [...p.consumers] })),
      groupOrder: [...this.s.groupOrder],
      subgroupOrder: Object.fromEntries(
        Object.entries(this.s.subgroupOrder).map(([k, v]) => [k, [...v]]),
      ),
      expenses: this.s.expenses.map((e) => ({ ...e, splitAmong: [...e.splitAmong] })),
      settledTransfers: this.s.settledTransfers.map((s) => ({ ...s })),
      history: this.s.history.map((h) => ({ ...h })),
      days: [...this.s.days],
      availability: Object.fromEntries(
        Object.entries(this.s.availability).map(([k, v]) => [k, [...v]]),
      ),
    }
  }
}
