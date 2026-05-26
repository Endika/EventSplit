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

  it('edit returns a new Purchase with updated quantity and unit', () => {
    const p = Purchase.create({
      createdBy: u1, category: 'drinks', item: 'Coke', quantity: 3, unit: 'bottles',
      dailyConsumption: 2,
      consumers: [{ userId: u1, multiplier: 1 }], days: 2,
    })
    const next = p.edit({
      category: 'drinks', item: 'Coke', quantity: 5, unit: 'cans', dailyConsumption: 2,
      consumers: [{ userId: u1, multiplier: 1 }], days: 2, assignedTo: null,
    })
    expect(next.id).toBe(p.id) // same id (preserved)
    expect(next.toSnapshot().quantity).toBe(5)
    expect(next.toSnapshot().unit).toBe('cans')
    expect(next.toSnapshot().category).toBe('drinks') // unchanged
    expect(next.toSnapshot().item).toBe('Coke') // unchanged
    expect(p.toSnapshot().quantity).toBe(3) // original immutable
  })

  it('edit recomputes totalQuantity', () => {
    const p = Purchase.create({
      createdBy: u1, category: 'drinks', item: 'Coke', quantity: 3, unit: 'bottles',
      dailyConsumption: 2,
      consumers: [{ userId: u1, multiplier: 1 }], days: 2,
    })
    expect(p.totalQuantity).toBe(4) // 2*1*2

    const next = p.edit({
      category: 'drinks', item: 'Coke', quantity: 3, unit: 'bottles', dailyConsumption: 3,
      consumers: [{ userId: u1, multiplier: 2 }], days: 3, assignedTo: null,
    })
    expect(next.totalQuantity).toBe(18) // 3*2*3
  })

  it('edit validates the same constraints as create', () => {
    const p = Purchase.create({
      createdBy: u1, category: 'drinks', item: 'Coke', quantity: 3, unit: 'bottles',
      dailyConsumption: 2,
      consumers: [{ userId: u1, multiplier: 1 }], days: 2,
    })
    expect(() => p.edit({
      category: 'drinks', item: 'Coke', quantity: 0, unit: 'bottles', dailyConsumption: 1,
      consumers: [{ userId: u1, multiplier: 1 }], days: 1, assignedTo: null,
    })).toThrow(/quantity/)
    expect(() => p.edit({
      category: 'drinks', item: 'Coke', quantity: 1, unit: 'bottles', dailyConsumption: 1,
      consumers: [], days: 1, assignedTo: null,
    })).toThrow(/consumer/)
    expect(() => p.edit({
      category: 'drinks', item: 'Coke', quantity: 1, unit: '   ', dailyConsumption: 1,
      consumers: [{ userId: u1, multiplier: 1 }], days: 1, assignedTo: null,
    })).toThrow(/unit/)
  })

  it('accepts a free-text unit', () => {
    const p = Purchase.create({
      createdBy: u1, category: 'drinks', item: 'Agua', quantity: 2, unit: 'garrafa de 8 litros',
      dailyConsumption: 1, consumers: [{ userId: u1, multiplier: 1 }], days: 2,
    })
    expect(p.toSnapshot().unit).toBe('garrafa de 8 litros')
  })

  it('rejects an empty or overlong unit', () => {
    expect(() => Purchase.create({
      createdBy: u1, category: 'drinks', item: 'Agua', quantity: 1, unit: '   ',
      dailyConsumption: 1, consumers: [{ userId: u1, multiplier: 1 }], days: 1,
    })).toThrow(/unit/)
    expect(() => Purchase.create({
      createdBy: u1, category: 'drinks', item: 'Agua', quantity: 1, unit: 'x'.repeat(31),
      dailyConsumption: 1, consumers: [{ userId: u1, multiplier: 1 }], days: 1,
    })).toThrow(/unit/)
  })

  it('new purchase starts unassigned and not purchased', () => {
    const p = Purchase.create({
      createdBy: u1, category: 'drinks', item: 'Coke', quantity: 1, unit: 'units',
      dailyConsumption: 1, consumers: [{ userId: u1, multiplier: 1 }], days: 1,
    })
    expect(p.toSnapshot().assignedTo).toBeNull()
    expect(p.toSnapshot().purchased).toBe(false)
  })

  it('edit can change item, category and unit', () => {
    const p = Purchase.create({
      createdBy: u1, category: 'drinks', item: 'Coke', quantity: 1, unit: 'units',
      dailyConsumption: 1, consumers: [{ userId: u1, multiplier: 1 }], days: 1,
    })
    const next = p.edit({
      category: 'food', item: 'Bread', quantity: 2, unit: 'loaves',
      dailyConsumption: 1, consumers: [{ userId: u1, multiplier: 1 }], days: 1, assignedTo: null,
    })
    expect(next.toSnapshot().item).toBe('Bread')
    expect(next.toSnapshot().category).toBe('food')
    expect(next.toSnapshot().unit).toBe('loaves')
  })

  it('assign sets the responsible buyer and purchased flag', () => {
    const p = Purchase.create({
      createdBy: u1, category: 'drinks', item: 'Coke', quantity: 1, unit: 'units',
      dailyConsumption: 1, consumers: [{ userId: u1, multiplier: 1 }], days: 1,
    })
    const assigned = p.assign({ assignedTo: u2, purchased: true })
    expect(assigned.toSnapshot().assignedTo).toBe(u2)
    expect(assigned.toSnapshot().purchased).toBe(true)
    expect(p.toSnapshot().assignedTo).toBeNull() // original immutable
  })
})
