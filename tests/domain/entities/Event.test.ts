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

  it('Event.create starts in doodle stage', () => {
    const e = Event.create({ name: 'Trip', creator: User.create({ name: 'John' }) })
    expect(e.toSnapshot().stage).toBe('doodle')
  })

  it('Event.restore backfills missing stage to doodle', () => {
    const e = Event.create({ name: 'Trip', creator: User.create({ name: 'John' }) })
    const snap = e.toSnapshot()
    // Simulate legacy snapshot
    const legacy = { ...snap } as Record<string, unknown>
    delete legacy.stage
    const restored = Event.restore(legacy as never)
    expect(restored.toSnapshot().stage).toBe('doodle')
  })

  it('setStage changes the stage and appends history', () => {
    const creator = User.create({ name: 'John' })
    const e = Event.create({ name: 'Trip', creator })
    const next = e.setStage({ stage: 'shopping', userId: creator.id.value })
    expect(next.toSnapshot().stage).toBe('shopping')
    expect(next.toSnapshot().history.at(-1)?.type).toBe('stage_changed')
  })

  it('setStage rejects unknown user', () => {
    const creator = User.create({ name: 'John' })
    const e = Event.create({ name: 'Trip', creator })
    expect(() =>
      e.setStage({ stage: 'shopping', userId: '00000000-0000-7000-8000-000000000000' }),
    ).toThrow(/not in event/i)
  })

  it('setStage rejects invalid stage', () => {
    const creator = User.create({ name: 'John' })
    const e = Event.create({ name: 'Trip', creator })
    expect(() =>
      e.setStage({ stage: 'invalid' as never, userId: creator.id.value }),
    ).toThrow(/invalid stage/i)
  })

  it('setStage to same stage is a no-op (no version bump)', () => {
    const creator = User.create({ name: 'John' })
    const e = Event.create({ name: 'Trip', creator })
    const initialHistoryLen = e.toSnapshot().history.length
    const same = e.setStage({ stage: 'doodle', userId: creator.id.value })
    expect(same.toSnapshot().history.length).toBe(initialHistoryLen)
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

  it('setAvailabilityMeta stores note and chosen day', () => {
    const creator = User.create({ name: 'John' })
    let e = Event.create({ name: 'Trip', creator })
    // need a day first
    const snap = e.toSnapshot()
    snap.days = ['2026-06-05', '2026-06-06']
    e = Event.restore(snap)
    const next = e.setAvailabilityMeta({ userId: creator.id.value, note: 'Weekends only', chosenDay: '2026-06-06' })
    expect(next.toSnapshot().availabilityNote).toBe('Weekends only')
    expect(next.toSnapshot().chosenDay).toBe('2026-06-06')
  })

  it('setAvailabilityMeta rejects a chosenDay not in days', () => {
    const creator = User.create({ name: 'John' })
    const e = Event.create({ name: 'Trip', creator })
    expect(() =>
      e.setAvailabilityMeta({ userId: creator.id.value, note: null, chosenDay: '2099-01-01' }),
    ).toThrow(/chosenDay/)
  })

  it('setAvailabilityMeta accepts null chosenDay (unset)', () => {
    const creator = User.create({ name: 'John' })
    const e = Event.create({ name: 'Trip', creator })
    const next = e.setAvailabilityMeta({ userId: creator.id.value, note: 'note', chosenDay: null })
    expect(next.toSnapshot().chosenDay).toBeNull()
    expect(next.toSnapshot().availabilityNote).toBe('note')
  })

  it('Event.create starts with null availability meta', () => {
    const e = Event.create({ name: 'Trip', creator: User.create({ name: 'John' }) })
    expect(e.toSnapshot().availabilityNote).toBeNull()
    expect(e.toSnapshot().chosenDay).toBeNull()
  })

  it('toggleSettlement adds and removes a settled transfer', () => {
    const creator = User.create({ name: 'John' })
    const e = Event.create({ name: 'Trip', creator })
    const u = creator.id.value
    const on = e.toggleSettlement({ userId: u, from: 'a', to: 'b' })
    expect(on.toSnapshot().settledTransfers).toEqual([{ from: 'a', to: 'b' }])
    expect(on.toSnapshot().history.at(-1)?.type).toBe('settlement_toggled')
    const off = on.toggleSettlement({ userId: u, from: 'a', to: 'b' })
    expect(off.toSnapshot().settledTransfers).toEqual([])
  })

  it('toggleSettlement rejects unknown user', () => {
    const e = Event.create({ name: 'Trip', creator: User.create({ name: 'John' }) })
    expect(() => e.toggleSettlement({ userId: '00000000-0000-7000-8000-000000000000', from: 'a', to: 'b' })).toThrow(/not in event/i)
  })

  it('Event.create starts with empty settledTransfers', () => {
    const e = Event.create({ name: 'Trip', creator: User.create({ name: 'John' }) })
    expect(e.toSnapshot().settledTransfers).toEqual([])
  })

  it('renameGroup renames the group across its purchases', () => {
    const creator = User.create({ name: 'John' })
    let e = Event.create({ name: 'Trip', creator })
    const snap = e.toSnapshot()
    snap.purchases.push({
      id: '01900000-0000-7000-8000-0000000000a1', createdBy: creator.id.value,
      item: 'Bread', quantity: 1, unit: 'units', dailyConsumption: 1,
      totalQuantity: 1, consumers: [{ userId: creator.id.value, multiplier: 1 }],
      deleted: false, deletedBy: null, deletedAt: null, deleteReason: null,
      createdAt: '2026-01-01T00:00:00Z', assignedTo: null, purchased: false, boughtQuantity: 0,
      group: 'Cena',
    } as never)
    e = Event.restore(snap)
    const renamed = e.renameGroup({ userId: creator.id.value, from: 'Cena', to: 'Cena sábado' })
    expect(renamed.toSnapshot().purchases[0]!.group).toBe('Cena sábado')
  })

  it('setGroupOrder stores the order', () => {
    const creator = User.create({ name: 'John' })
    const e = Event.create({ name: 'Trip', creator })
    const next = e.setGroupOrder({ userId: creator.id.value, order: ['B', 'A'] })
    expect(next.toSnapshot().groupOrder).toEqual(['B', 'A'])
  })

  it('renameGroup rejects unknown user', () => {
    const e = Event.create({ name: 'Trip', creator: User.create({ name: 'John' }) })
    expect(() => e.renameGroup({ userId: '00000000-0000-7000-8000-000000000000', from: 'X', to: 'Y' })).toThrow(/not in event/i)
  })

  it('Event.create starts with empty groupOrder', () => {
    const e = Event.create({ name: 'Trip', creator: User.create({ name: 'John' }) })
    expect(e.toSnapshot().groupOrder).toEqual([])
  })
})
