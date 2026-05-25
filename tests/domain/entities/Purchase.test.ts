import { describe, it, expect } from 'vitest'
import { Purchase } from '@/domain/entities/Purchase'
import { UserId } from '@/domain/value-objects/UserId'

describe('Purchase', () => {
  const u1 = UserId.generate().value
  const u2 = UserId.generate().value

  it('rejects empty item name', () => {
    expect(() =>
      Purchase.create({
        createdBy: u1, category: 'drinks', item: ' ', quantity: 1, unit: 'units',
        dailyConsumption: 1, consumers: [{ userId: u1, multiplier: 1 }], days: 2,
      })
    ).toThrow(/item/)
  })

  it('rejects empty consumers list', () => {
    expect(() =>
      Purchase.create({
        createdBy: u1, category: 'drinks', item: 'Coke', quantity: 1, unit: 'units',
        dailyConsumption: 1, consumers: [], days: 2,
      })
    ).toThrow(/consumer/)
  })

  it('computes totalQuantity = sum(dailyConsumption * multiplier) * days', () => {
    const p = Purchase.create({
      createdBy: u1, category: 'drinks', item: 'Coke', quantity: 3, unit: 'bottles',
      dailyConsumption: 2,
      consumers: [
        { userId: u1, multiplier: 1 },
        { userId: u2, multiplier: 0.5 },
      ],
      days: 3,
    })
    expect(p.totalQuantity).toBe(9) // (2*1 + 2*0.5) * 3 = 9
  })

  it('validates each multiplier via the VO', () => {
    expect(() =>
      Purchase.create({
        createdBy: u1, category: 'drinks', item: 'Coke', quantity: 1, unit: 'units',
        dailyConsumption: 1,
        consumers: [{ userId: u1, multiplier: 1.3 }],
        days: 2,
      })
    ).toThrow(/step/)
  })

  it('soft-deletes with reason and editor', () => {
    const p = Purchase.create({
      createdBy: u1, category: 'food', item: 'Bread', quantity: 1, unit: 'units',
      dailyConsumption: 0.5,
      consumers: [{ userId: u1, multiplier: 1 }], days: 2,
    })
    const deleted = p.softDelete({ by: u2, reason: 'Out of stock' })
    expect(deleted.deleted).toBe(true)
    expect(deleted.deletedBy).toBe(u2)
    expect(deleted.deleteReason).toBe('Out of stock')
    expect(p.deleted).toBe(false) // original unchanged (immutable)
  })
})
