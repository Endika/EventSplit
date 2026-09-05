import { describe, it, expect } from 'vitest'
import { Event } from '@/domain/entities/Event'
import { User } from '@/domain/entities/User'

const newEvent = () =>
  Event.create({ name: 'Casa rural', creator: User.create({ name: 'Javi', alias: null }) })

describe('Event manualLiquidations', () => {
  it('starts with an empty manualLiquidations array', () => {
    expect(newEvent().toSnapshot().manualLiquidations).toEqual([])
  })

  it('backfills manualLiquidations on restore of an older snapshot', () => {
    const snap = newEvent().toSnapshot()
    delete (snap as { manualLiquidations?: unknown }).manualLiquidations
    expect(Event.restore(snap).toSnapshot().manualLiquidations).toEqual([])
  })

  it('removeUser strips the user from affects and paidShares of manual liquidations', () => {
    const creator = User.create({ name: 'Javi', alias: null })
    const other = User.create({ name: 'Endika', alias: null })
    const base = Event.create({ name: 'Casa rural', creator }).addUser(other)
    const snap = base.toSnapshot()
    snap.manualLiquidations = [
      {
        id: 'liq-1',
        concept: 'Señal',
        cents: 20000,
        currency: 'EUR',
        paidBy: creator.id.value,
        affects: [creator.id.value, other.id.value],
        paidShares: [other.id.value],
        createdAt: new Date().toISOString(),
        deleted: false,
        deletedBy: null,
        deletedAt: null,
      },
    ]
    const cleaned = Event.restore(snap).removeUser(other.id.value).toSnapshot()
    expect(cleaned.manualLiquidations[0]!.affects).toEqual([creator.id.value])
    expect(cleaned.manualLiquidations[0]!.paidShares).toEqual([])
  })

  it('removeUser refuses if the user is the payer of a live manual liquidation', () => {
    const creator = User.create({ name: 'Javi', alias: null })
    const other = User.create({ name: 'Endika', alias: null })
    const snap = Event.create({ name: 'Casa rural', creator }).addUser(other).toSnapshot()
    snap.manualLiquidations = [
      {
        id: 'liq-1',
        concept: 'Señal',
        cents: 20000,
        currency: 'EUR',
        paidBy: other.id.value,
        affects: [creator.id.value, other.id.value],
        paidShares: [],
        createdAt: new Date().toISOString(),
        deleted: false,
        deletedBy: null,
        deletedAt: null,
      },
    ]
    expect(() => Event.restore(snap).removeUser(other.id.value)).toThrow(/manual liquidation/i)
  })
})
