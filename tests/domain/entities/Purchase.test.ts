import { describe, it, expect } from 'vitest'
import { Purchase } from '@/domain/entities/Purchase'
import { UserId } from '@/domain/value-objects/UserId'

describe('Purchase', () => {
  const u1 = UserId.generate().value
  const u2 = UserId.generate().value

  it('rejects empty item name', () => {
    expect(() =>
      Purchase.create({
        createdBy: u1,
        item: ' ',
        quantity: 1,
        unit: 'units',
        dailyConsumption: 1,
        consumers: [{ userId: u1, multiplier: 1 }],
        days: 2,
      }),
    ).toThrow(/item/)
  })

  it('uses a fixed quantity for the "single" shared unit (no per-person calc)', () => {
    const p = Purchase.create({
      createdBy: u1,
      item: 'Salt',
      quantity: 1,
      unit: 'single',
      dailyConsumption: 5,
      consumers: [
        { userId: u1, multiplier: 1 },
        { userId: u2, multiplier: 1 },
      ],
      days: 4,
    })
    expect(p.totalQuantity).toBe(1) // fixed, ignores 5 * 2 * 4
  })

  it('editBring converts a buy item into a brought item', () => {
    const p = Purchase.create({
      createdBy: u1,
      item: 'Coffee',
      quantity: 1,
      unit: 'single',
      dailyConsumption: 1,
      consumers: [{ userId: u1, multiplier: 1 }],
      days: 2,
    })
    const brought = p.editBring({
      item: 'Coffee',
      quantity: 1,
      unit: 'single',
      group: null,
      broughtBy: u2,
    })
    expect(brought.kind).toBe('bring')
    expect(brought.assignedTo).toBe(u2)
  })

  it('edit converts a brought item back into a buy item', () => {
    const b = Purchase.createBring({
      createdBy: u1,
      item: 'Coffee',
      quantity: 1,
      unit: 'single',
      broughtBy: u1,
    })
    const buy = b.edit({
      item: 'Coffee',
      quantity: 1,
      unit: 'single',
      dailyConsumption: 1,
      consumers: [{ userId: u1, multiplier: 1 }],
      days: 1,
      assignedTo: null,
      group: null,
    })
    expect(buy.kind).toBe('buy')
  })

  it('validates each multiplier via the VO', () => {
    expect(() =>
      Purchase.create({
        createdBy: u1,
        item: 'Coke',
        quantity: 1,
        unit: 'units',
        dailyConsumption: 1,
        consumers: [{ userId: u1, multiplier: 1.3 }],
        days: 2,
      }),
    ).toThrow(/step/)
  })

  it('soft-deletes with reason and editor', () => {
    const p = Purchase.create({
      createdBy: u1,
      item: 'Bread',
      quantity: 1,
      unit: 'units',
      dailyConsumption: 0.5,
      consumers: [{ userId: u1, multiplier: 1 }],
      days: 2,
    })
    const deleted = p.softDelete({ by: u2, reason: '  Out of stock  ' })
    expect(deleted.deleted).toBe(true)
    expect(deleted.deletedBy).toBe(u2)
    expect(deleted.deleteReason).toBe('Out of stock')
    expect(p.deleted).toBe(false) // original unchanged (immutable)
  })

  it('edit validates the same constraints as create', () => {
    const p = Purchase.create({
      createdBy: u1,
      item: 'Coke',
      quantity: 3,
      unit: 'bottles',
      dailyConsumption: 2,
      consumers: [{ userId: u1, multiplier: 1 }],
      days: 2,
    })
    expect(() =>
      p.edit({
        item: 'Coke',
        quantity: 0,
        unit: 'bottles',
        dailyConsumption: 1,
        consumers: [{ userId: u1, multiplier: 1 }],
        days: 1,
        assignedTo: null,
        group: null,
      }),
    ).toThrow(/quantity/)
    expect(() =>
      p.edit({
        item: 'Coke',
        quantity: 1,
        unit: 'bottles',
        dailyConsumption: 1,
        consumers: [],
        days: 1,
        assignedTo: null,
        group: null,
      }),
    ).toThrow(/consumer/)
    expect(() =>
      p.edit({
        item: 'Coke',
        quantity: 1,
        unit: '   ',
        dailyConsumption: 1,
        consumers: [{ userId: u1, multiplier: 1 }],
        days: 1,
        assignedTo: null,
        group: null,
      }),
    ).toThrow(/unit/)
  })

  it('accepts a free-text unit and trims item and unit', () => {
    const p = Purchase.create({
      createdBy: u1,
      item: '  Agua  ',
      quantity: 2,
      unit: '  garrafa de 8 litros  ',
      dailyConsumption: 1,
      consumers: [{ userId: u1, multiplier: 1 }],
      days: 2,
    })
    expect(p.toSnapshot().unit).toBe('garrafa de 8 litros')
    expect(p.toSnapshot().item).toBe('Agua')
  })

  it('rejects an empty or overlong unit', () => {
    expect(() =>
      Purchase.create({
        createdBy: u1,
        item: 'Agua',
        quantity: 1,
        unit: '   ',
        dailyConsumption: 1,
        consumers: [{ userId: u1, multiplier: 1 }],
        days: 1,
      }),
    ).toThrow(/unit/)
    expect(() =>
      Purchase.create({
        createdBy: u1,
        item: 'Agua',
        quantity: 1,
        unit: 'x'.repeat(31),
        dailyConsumption: 1,
        consumers: [{ userId: u1, multiplier: 1 }],
        days: 1,
      }),
    ).toThrow(/unit/)
  })

  it('setBoughtQuantity clamps and derives purchased', () => {
    const p = Purchase.create({
      createdBy: u1,
      item: 'Coke',
      quantity: 1,
      unit: 'units',
      dailyConsumption: 2,
      consumers: [{ userId: u1, multiplier: 1 }],
      days: 3,
    }) // totalQuantity = 6
    const partial = p.setBoughtQuantity(4)
    expect(partial.toSnapshot().boughtQuantity).toBe(4)
    expect(partial.toSnapshot().purchased).toBe(false)
    const over = p.setBoughtQuantity(999)
    expect(over.toSnapshot().boughtQuantity).toBe(6) // clamped to total
    expect(over.toSnapshot().purchased).toBe(true)
    const neg = p.setBoughtQuantity(-5)
    expect(neg.toSnapshot().boughtQuantity).toBe(0)
  })

  it('setBoughtQuantity never marks a zero-total purchase as purchased', () => {
    const p = Purchase.create({
      createdBy: u1,
      item: 'Salt',
      quantity: 1,
      unit: 'units',
      dailyConsumption: 0.001,
      consumers: [{ userId: u1, multiplier: 1 }],
      days: 1,
    })
    expect(p.totalQuantity).toBe(0)
    expect(p.setBoughtQuantity(5).purchased).toBe(false)
  })

  it('stores a trimmed group, null when blank', () => {
    const p = Purchase.create({
      createdBy: u1,
      item: 'Bread',
      quantity: 1,
      unit: 'units',
      dailyConsumption: 1,
      consumers: [{ userId: u1, multiplier: 1 }],
      days: 1,
      group: '  Cena sábado  ',
    })
    expect(p.toSnapshot().group).toBe('Cena sábado')
    const p2 = Purchase.create({
      createdBy: u1,
      item: 'Milk',
      quantity: 1,
      unit: 'units',
      dailyConsumption: 1,
      consumers: [{ userId: u1, multiplier: 1 }],
      days: 1,
      group: '   ',
    })
    expect(p2.toSnapshot().group).toBeNull()
    const p3 = Purchase.create({
      createdBy: u1,
      item: 'Milk',
      quantity: 1,
      unit: 'units',
      dailyConsumption: 1,
      consumers: [{ userId: u1, multiplier: 1 }],
      days: 1,
      group: `  ${'g'.repeat(60)}`,
    })
    expect(p3.toSnapshot().group).toBe('g'.repeat(50))
  })

  it('new purchase has null group by default', () => {
    const p = Purchase.create({
      createdBy: u1,
      item: 'XY',
      quantity: 1,
      unit: 'units',
      dailyConsumption: 1,
      consumers: [{ userId: u1, multiplier: 1 }],
      days: 1,
    })
    expect(p.toSnapshot().group).toBeNull()
  })

  it('a normal create has kind "buy"', () => {
    const p = Purchase.create({
      createdBy: u1,
      item: 'Coke',
      quantity: 1,
      unit: 'units',
      dailyConsumption: 1,
      consumers: [{ userId: u1, multiplier: 1 }],
      days: 1,
    })
    expect(p.kind).toBe('buy')
  })

  it('createBring produces a bring item', () => {
    const p = Purchase.createBring({
      createdBy: u1,
      item: 'Tortilla',
      quantity: 2,
      unit: 'units',
      group: 'Desayuno',
      broughtBy: u2,
    })
    expect(p.kind).toBe('bring')
    expect(p.toSnapshot().totalQuantity).toBe(2)
    expect(p.toSnapshot().quantity).toBe(2)
    expect(p.toSnapshot().consumers).toEqual([])
    expect(p.toSnapshot().assignedTo).toBe(u2)
    expect(p.toSnapshot().group).toBe('Desayuno')
    expect(p.toSnapshot().dailyConsumption).toBe(0)
    expect(p.purchased).toBe(false)
  })

  describe('validation bounds', () => {
    const buy = (over: Record<string, unknown>) => () =>
      Purchase.create({
        createdBy: u1,
        item: 'Coke',
        quantity: 1,
        unit: 'units',
        dailyConsumption: 1,
        consumers: [{ userId: u1, multiplier: 1 }],
        days: 1,
        ...over,
      })

    it.each([
      ['item at 50 chars', { item: 'a'.repeat(50) }, true],
      ['item at 51 chars', { item: 'a'.repeat(51) }, false],
      ['unit at 1 char', { unit: 'x' }, true],
      ['unit at 30 chars', { unit: 'x'.repeat(30) }, true],
      ['quantity at the max', { quantity: 10_000 }, true],
      ['quantity over the max', { quantity: 10_001 }, false],
      ['daily consumption at the max', { dailyConsumption: 100 }, true],
      ['daily consumption over the max', { dailyConsumption: 100.01 }, false],
      ['daily consumption of zero', { dailyConsumption: 0 }, false],
      ['days of zero', { days: 0 }, false],
    ])('%s', (_label, over, ok) => {
      if (ok) expect(buy(over)).not.toThrow()
      else expect(buy(over)).toThrow()
    })
  })

  describe('restore', () => {
    const legacy = {
      id: 'p-1',
      createdBy: 'u-1',
      item: 'Bread',
      quantity: 1,
      unit: 'units',
      dailyConsumption: 1,
      totalQuantity: 4,
      consumers: [{ userId: 'u-1', multiplier: 1 }],
      deleted: false,
      deletedBy: null,
      deletedAt: null,
      deleteReason: null,
      createdAt: '2026-01-01T00:00:00Z',
    }

    it('backfills fields missing from a legacy snapshot and drops the old category', () => {
      const restored = Purchase.restore({ ...legacy, category: 'food' } as never)
      expect(restored.toSnapshot()).toEqual({
        ...legacy,
        kind: 'buy',
        assignedTo: null,
        purchased: false,
        boughtQuantity: 0,
        group: null,
        subgroup: null,
      })
      expect(Purchase.restore({ ...legacy, purchased: true } as never).boughtQuantity).toBe(4)
    })
  })
})
