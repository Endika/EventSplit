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
  | 'user_profile_updated'
  | 'days_set'

export interface HistoryEntry {
  id: string
  version: number
  timestamp: string
  type: HistoryType
  userId: string
  description: string
  before: unknown
  after: unknown
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
    return new Event(id, snapshot)
  }

  static restore(s: EventSnapshot): Event {
    return new Event(EventId.of(s.id), s)
  }

  addUser(user: User): Event {
    if (this.s.users.some((u) => u.id === user.id.value))
      throw new Error('Event: user already in event')
    const now = new Date().toISOString()
    const nextVersion = (this.s.history.at(-1)?.version ?? 0) + 1
    return new Event(this.id, {
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
    })
  }

  get name(): string { return this.s.name }
  get users(): UserSnapshot[] { return this.s.users }

  toSnapshot(): EventSnapshot {
    return {
      ...this.s,
      users: this.s.users.map((u) => ({ ...u })),
      purchases: this.s.purchases.map((p) => ({ ...p, consumers: [...p.consumers] })),
      expenses: this.s.expenses.map((e) => ({ ...e })),
      history: this.s.history.map((h) => ({ ...h })),
      days: [...this.s.days],
      availability: Object.fromEntries(
        Object.entries(this.s.availability).map(([k, v]) => [k, [...v]]),
      ),
    }
  }
}
