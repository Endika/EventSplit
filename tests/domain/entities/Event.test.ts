import { describe, it, expect } from 'vitest'
import { Event } from '@/domain/entities/Event'
import { User } from '@/domain/entities/User'

describe('Event', () => {
  it('rejects event name shorter than 3 chars', () => {
    const creator = User.create({ name: 'John' })
    expect(() => Event.create({ name: 'AB', creator })).toThrow(/name/)
  })

  it('rejects event name longer than 100 chars', () => {
    const creator = User.create({ name: 'John' })
    expect(() => Event.create({ name: 'a'.repeat(101), creator })).toThrow(/name/)
  })

  it('puts creator into users[] and seeds history', () => {
    const creator = User.create({ name: 'John', alias: 'cousin' })
    const e = Event.create({ name: 'Trip', creator })
    const snap = e.toSnapshot()
    expect(snap.users).toHaveLength(1)
    expect(snap.users[0]!.name).toBe('John')
    expect(snap.createdBy).toBe(creator.id.value)
    expect(snap.history).toHaveLength(1)
    expect(snap.history[0]!.type).toBe('event_created')
  })

  it('round-trips through toSnapshot / restore', () => {
    const creator = User.create({ name: 'John' })
    const e = Event.create({ name: 'Trip', creator })
    const restored = Event.restore(e.toSnapshot())
    expect(restored.toSnapshot()).toEqual(e.toSnapshot())
  })

  it('addUser appends to users[] and history', () => {
    const creator = User.create({ name: 'John' })
    const e = Event.create({ name: 'Trip', creator })
    const maria = User.create({ name: 'Maria' })
    const next = e.addUser(maria)
    expect(next.toSnapshot().users.map((u) => u.name)).toEqual(['John', 'Maria'])
    expect(next.toSnapshot().history.at(-1)?.type).toBe('user_joined')
  })

  it('rejects duplicate user id', () => {
    const creator = User.create({ name: 'John' })
    const e = Event.create({ name: 'Trip', creator })
    expect(() => e.addUser(creator)).toThrow(/already/)
  })

  it('removeUser drops the user from users list and history records it', () => {
    const creator = User.create({ name: 'John' })
    const e = Event.create({ name: 'Trip', creator })
    const maria = User.create({ name: 'Maria' })
    const next = e.addUser(maria)
    const after = next.removeUser(maria.id.value)
    expect(after.toSnapshot().users.map((u) => u.name)).toEqual(['John'])
    expect(after.toSnapshot().history.at(-1)?.type).toBe('user_removed')
  })

  it('removeUser rejects removing the event creator', () => {
    const creator = User.create({ name: 'John' })
    const e = Event.create({ name: 'Trip', creator })
    expect(() => e.removeUser(creator.id.value)).toThrow(/creator/i)
  })

  it('removeUser rejects unknown user', () => {
    const creator = User.create({ name: 'John' })
    const e = Event.create({ name: 'Trip', creator })
    expect(() => e.removeUser('00000000-0000-7000-8000-000000000000')).toThrow(/not in event/i)
  })

  it('removeUser cleans availability and purchase consumers', () => {
    const creator = User.create({ name: 'John' })
    let e = Event.create({ name: 'Trip', creator })
    const maria = User.create({ name: 'Maria' })
    e = e.addUser(maria)
    // Manually inject availability and consumers via toSnapshot/restore
    const snap = e.toSnapshot()
    snap.availability[maria.id.value] = [true, false]
    snap.purchases.push({
      id: '01900000-0000-7000-8000-000000000001',
      createdBy: creator.id.value, // creator owns it — not maria
      category: 'drinks',
      item: 'Coke',
      quantity: 1,
      unit: 'bottles',
      dailyConsumption: 1,
      totalQuantity: 1,
      consumers: [
        { userId: creator.id.value, multiplier: 1 },
        { userId: maria.id.value, multiplier: 1 },
      ],
      deleted: false,
      deletedBy: null,
      deletedAt: null,
      deleteReason: null,
      createdAt: '2026-01-01T00:00:00Z',
    })
    e = Event.restore(snap)

    const after = e.removeUser(maria.id.value).toSnapshot()
    expect(after.availability[maria.id.value]).toBeUndefined()
    expect(after.purchases[0]!.consumers.map((c) => c.userId)).toEqual([creator.id.value])
  })

  it('removeUser rejects if user paid for expenses', () => {
    const creator = User.create({ name: 'John' })
    let e = Event.create({ name: 'Trip', creator })
    const maria = User.create({ name: 'Maria' })
    e = e.addUser(maria)
    const snap = e.toSnapshot()
    snap.expenses.push({
      id: '01900000-0000-7000-8000-000000000002',
      paidBy: maria.id.value,
      cents: 100,
      currency: 'EUR',
      description: 'Snacks',
      purchaseId: null,
      date: '2026-01-01T00:00:00Z',
      createdAt: '2026-01-01T00:00:00Z',
      splitAmong: [],
    })
    e = Event.restore(snap)
    expect(() => e.removeUser(maria.id.value)).toThrow(/paid for expenses/i)
  })

  it('removeUser rejects if user created non-deleted purchases', () => {
    const creator = User.create({ name: 'John' })
    let e = Event.create({ name: 'Trip', creator })
    const maria = User.create({ name: 'Maria' })
    e = e.addUser(maria)
    const snap = e.toSnapshot()
    snap.purchases.push({
      id: '01900000-0000-7000-8000-000000000003',
      createdBy: maria.id.value,
      category: 'drinks',
      item: 'Coke',
      quantity: 1,
      unit: 'bottles',
      dailyConsumption: 1,
      totalQuantity: 1,
      consumers: [{ userId: maria.id.value, multiplier: 1 }],
      deleted: false,
      deletedBy: null,
      deletedAt: null,
      deleteReason: null,
      createdAt: '2026-01-01T00:00:00Z',
    })
    e = Event.restore(snap)
    expect(() => e.removeUser(maria.id.value)).toThrow(/created purchases/i)
  })

  it('restore backfills missing fields from legacy snapshots', () => {
    // Simulate an event JSON from before Slice 2 (no days/availability/location/editPin)
    const legacy = {
      id: 'abc123x',
      name: 'Old trip',
      createdBy: 'user-old',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      users: [{ id: 'user-old', name: 'John', alias: null, joinedAt: '2026-01-01T00:00:00Z' }],
      purchases: [],
      expenses: [],
      history: [],
    } as never
    const e = Event.restore(legacy)
    const snap = e.toSnapshot()
    expect(snap.days).toEqual([])
    expect(snap.availability).toEqual({})
    expect(snap.location).toBeNull()
    expect(snap.editPin).toBeNull()
    expect(snap.users[0]!.allergies).toEqual([])
    expect(snap.users[0]!.email).toBeNull()
  })
})
