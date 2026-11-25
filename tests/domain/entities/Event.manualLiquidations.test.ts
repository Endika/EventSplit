import { describe, it, expect } from 'vitest'
import { Event } from '@/domain/entities/Event'
import { User } from '@/domain/entities/User'

describe('Event manualLiquidations', () => {
  it('removeUser strips the user from affects and paidShares of manual liquidations', () => {
    const creator = User.create({ name: 'Javi', alias: null })
    const other = User.create({ name: 'Endika', alias: null })
    const third = User.create({ name: 'Marta', alias: null })
    const base = Event.create({ name: 'Casa rural', creator }).addUser(other).addUser(third)
    const snap = base.toSnapshot()
    snap.manualLiquidations = [
      {
        id: 'liq-1',
        concept: 'Señal',
        cents: 20000,
        currency: 'EUR',
        paidBy: creator.id.value,
        affects: [creator.id.value, other.id.value, third.id.value],
        paidShares: [other.id.value, third.id.value],
        createdAt: new Date().toISOString(),
        deleted: false,
        deletedBy: null,
        deletedAt: null,
      },
    ]
    const cleaned = Event.restore(snap).removeUser(other.id.value).toSnapshot()
    expect(cleaned.manualLiquidations[0]!.affects).toEqual([creator.id.value, third.id.value])
    expect(cleaned.manualLiquidations[0]!.paidShares).toEqual([third.id.value])
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
