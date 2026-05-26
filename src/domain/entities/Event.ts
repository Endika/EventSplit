import { EventId } from '@/domain/value-objects/EventId'
import { User } from '@/domain/entities/User'
import type { UserSnapshot } from '@/domain/entities/User'
import type { PurchaseSnapshot } from '@/domain/entities/Purchase'
import type { ExpenseSnapshot } from '@/domain/entities/Expense'

export type HistoryType =
  | 'event_created'
  | 'user_joined'
  | 'purchase_added'
  | 'purchase_edited'
  | 'purchase_deleted'
  | 'purchase_recovered'
  | 'expense_added'
  | 'availability_voted'
  | 'location_set'
  | 'notes_added'
  | 'revert'
  | 'days_set'
  | 'user_profile_updated'
  | 'edit_pin_set'
  | 'edit_pin_cleared'

export interface HistoryEntry {
  id: string
  version: number
  timestamp: string
  type: HistoryType
  userId: string
  description: string
  before: unknown
  after: unknown
  fullState?: Omit<EventSnapshot, 'history'>
}

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
  days: string[]
  purchases: PurchaseSnapshot[]
  expenses: ExpenseSnapshot[]
  editPin: string | null
  history: HistoryEntry[]
  createdAt: string
  updatedAt: string
}

export class Event {
  private constructor(
    readonly id: EventId,
    private readonly s: EventSnapshot,
  ) {}

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
      days: [],
      purchases: [],
      expenses: [],
      editPin: null,
      history: [
        {
          id: crypto.randomUUID(),
          version: 1,
          timestamp: now,
          type: 'event_created',
          userId: input.creator.id.value,
          description: `Event created: ${name}`,
          before: null,
          after: { name },
        },
      ],
      createdAt: now,
      updatedAt: now,
    }
    const { history: _omit, ...fullState } = snapshot
    snapshot.history[0]!.fullState = fullState
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
      purchases: s.purchases ?? [],
      expenses: (s.expenses ?? []).map((e) => ({ ...e, splitAmong: e.splitAmong ?? [] })),
      history: s.history ?? [],
      editPin: s.editPin ?? null,
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
          before: null,
          after: { userId: user.id.value, displayName: user.displayName },
        },
      ],
    }
    const { history: _omit, ...fullState } = nextSnapshot
    nextSnapshot.history.at(-1)!.fullState = fullState
    return new Event(this.id, nextSnapshot)
  }

  get name(): string { return this.s.name }
  get users(): UserSnapshot[] { return this.s.users }

  toSnapshot(): EventSnapshot {
    return {
      ...this.s,
      users: this.s.users.map((u) => ({ ...u })),
      purchases: this.s.purchases.map((p) => ({ ...p, consumers: [...p.consumers] })),
      expenses: this.s.expenses.map((e) => ({ ...e, splitAmong: [...e.splitAmong] })),
      history: this.s.history.map((h) => ({ ...h })),
      days: [...this.s.days],
      availability: Object.fromEntries(
        Object.entries(this.s.availability).map(([k, v]) => [k, [...v]]),
      ),
    }
  }
}
