import { describe, it, expect } from 'vitest'
import { Purchase } from '@/domain/entities/Purchase'
import { UserId } from '@/domain/value-objects/UserId'

describe('Purchase', () => {
  const u1 = UserId.generate().value
  const u2 = UserId.generate().value

  it('rejects empty item name', () => {
    expect(() =>
      Purchase.create({
        createdBy: u1, item: ' ', quantity: 1, unit: 'units',
        dailyConsumption: 1, consumers: [{ userId: u1, multiplier: 1 }], days: 2,
      })
    ).toThrow(/item/)
  })

  it('rejects empty consumers list', () => {
    expect(() =>
      Purchase.create({
        createdBy: u1, item: 'Coke', quantity: 1, unit: 'units',
        dailyConsumption: 1, consumers: [], days: 2,
      })
    ).toThrow(/consumer/)
  })

  it('computes totalQuantity = sum(dailyConsumption * multiplier) * days', () => {
    const p = Purchase.create({
      createdBy: u1, item: 'Coke', quantity: 3, unit: 'bottles',
      dailyConsumption: 2,
      consumers: [
        { userId: u1, multiplier: 1 },
        { userId: u2, multiplier: 0.5 },
      ],
      days: 3,
    })
    expect(p.totalQuantity).toBe(9) // (2*1 + 2*0.5) * 3 = 9
  })

  it('uses a fixed quantity for the "single" shared unit (no per-person calc)', () => {
    const p = Purchase.create({
      createdBy: u1, item: 'Salt', quantity: 1, unit: 'single',
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
      createdBy: u1, item: 'Coffee', quantity: 1, unit: 'single',
      dailyConsumption: 1, consumers: [{ userId: u1, multiplier: 1 }], days: 2,
    })
    const brought = p.editBring({ item: 'Coffee', quantity: 1, unit: 'single', group: null, broughtBy: u2 })
    expect(brought.kind).toBe('bring')
    expect(brought.assignedTo).toBe(u2)
  })

  it('edit converts a brought item back into a buy item', () => {
    const b = Purchase.createBring({ createdBy: u1, item: 'Coffee', quantity: 1, unit: 'single', broughtBy: u1 })
    const buy = b.edit({
      item: 'Coffee', quantity: 1, unit: 'single', dailyConsumption: 1,
      consumers: [{ userId: u1, multiplier: 1 }], days: 1, assignedTo: null, group: null,
    })
    expect(buy.kind).toBe('buy')
  })

  it('validates each multiplier via the VO', () => {
    expect(() =>
      Purchase.create({
        createdBy: u1, item: 'Coke', quantity: 1, unit: 'units',
        dailyConsumption: 1,
        consumers: [{ userId: u1, multiplier: 1.3 }],
        days: 2,
      })
    ).toThrow(/step/)
  })

  it('soft-deletes with reason and editor', () => {
    const p = Purchase.create({
      createdBy: u1, item: 'Bread', quantity: 1, unit: 'units',
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
      createdBy: u1, item: 'Coke', quantity: 3, unit: 'bottles',
      dailyConsumption: 2,
      consumers: [{ userId: u1, multiplier: 1 }], days: 2,
    })
    const next = p.edit({
      item: 'Coke', quantity: 5, unit: 'cans', dailyConsumption: 2,
      consumers: [{ userId: u1, multiplier: 1 }], days: 2, assignedTo: null, group: null,
    })
    expect(next.id).toBe(p.id) // same id (preserved)
    expect(next.toSnapshot().quantity).toBe(5)
    expect(next.toSnapshot().unit).toBe('cans')
    expect(next.toSnapshot().item).toBe('Coke') // unchanged
    expect(p.toSnapshot().quantity).toBe(3) // original immutable
  })

  it('edit recomputes totalQuantity', () => {
    const p = Purchase.create({
      createdBy: u1, item: 'Coke', quantity: 3, unit: 'bottles',
      dailyConsumption: 2,
      consumers: [{ userId: u1, multiplier: 1 }], days: 2,
    })
    expect(p.totalQuantity).toBe(4) // 2*1*2

    const next = p.edit({
      item: 'Coke', quantity: 3, unit: 'bottles', dailyConsumption: 3,
      consumers: [{ userId: u1, multiplier: 2 }], days: 3, assignedTo: null, group: null,
    })
    expect(next.totalQuantity).toBe(18) // 3*2*3
  })

  it('edit validates the same constraints as create', () => {
    const p = Purchase.create({
      createdBy: u1, item: 'Coke', quantity: 3, unit: 'bottles',
      dailyConsumption: 2,
      consumers: [{ userId: u1, multiplier: 1 }], days: 2,
    })
    expect(() => p.edit({
      item: 'Coke', quantity: 0, unit: 'bottles', dailyConsumption: 1,
      consumers: [{ userId: u1, multiplier: 1 }], days: 1, assignedTo: null, group: null,
    })).toThrow(/quantity/)
    expect(() => p.edit({
      item: 'Coke', quantity: 1, unit: 'bottles', dailyConsumption: 1,
      consumers: [], days: 1, assignedTo: null, group: null,
    })).toThrow(/consumer/)
    expect(() => p.edit({
      item: 'Coke', quantity: 1, unit: '   ', dailyConsumption: 1,
      consumers: [{ userId: u1, multiplier: 1 }], days: 1, assignedTo: null, group: null,
    })).toThrow(/unit/)
  })

  it('accepts a free-text unit', () => {
    const p = Purchase.create({
      createdBy: u1, item: 'Agua', quantity: 2, unit: 'garrafa de 8 litros',
      dailyConsumption: 1, consumers: [{ userId: u1, multiplier: 1 }], days: 2,
    })
    expect(p.toSnapshot().unit).toBe('garrafa de 8 litros')
  })

  it('rejects an empty or overlong unit', () => {
    expect(() => Purchase.create({
      createdBy: u1, item: 'Agua', quantity: 1, unit: '   ',
      dailyConsumption: 1, consumers: [{ userId: u1, multiplier: 1 }], days: 1,
    })).toThrow(/unit/)
    expect(() => Purchase.create({
      createdBy: u1, item: 'Agua', quantity: 1, unit: 'x'.repeat(31),
      dailyConsumption: 1, consumers: [{ userId: u1, multiplier: 1 }], days: 1,
    })).toThrow(/unit/)
  })

  it('new purchase starts unassigned and not purchased', () => {
    const p = Purchase.create({
      createdBy: u1, item: 'Coke', quantity: 1, unit: 'units',
      dailyConsumption: 1, consumers: [{ userId: u1, multiplier: 1 }], days: 1,
    })
    expect(p.toSnapshot().assignedTo).toBeNull()
    expect(p.toSnapshot().purchased).toBe(false)
  })

  it('edit can change item and unit', () => {
    const p = Purchase.create({
      createdBy: u1, item: 'Coke', quantity: 1, unit: 'units',
      dailyConsumption: 1, consumers: [{ userId: u1, multiplier: 1 }], days: 1,
    })
    const next = p.edit({
      item: 'Bread', quantity: 2, unit: 'loaves',
      dailyConsumption: 1, consumers: [{ userId: u1, multiplier: 1 }], days: 1, assignedTo: null, group: null,
    })
    expect(next.toSnapshot().item).toBe('Bread')
    expect(next.toSnapshot().unit).toBe('loaves')
  })

  it('assign sets the responsible buyer and purchased flag', () => {
    const p = Purchase.create({
      createdBy: u1, item: 'Coke', quantity: 1, unit: 'units',
      dailyConsumption: 1, consumers: [{ userId: u1, multiplier: 1 }], days: 1,
    })
    const assigned = p.assign({ assignedTo: u2, purchased: true })
    expect(assigned.toSnapshot().assignedTo).toBe(u2)
    expect(assigned.toSnapshot().purchased).toBe(true)
    expect(p.toSnapshot().assignedTo).toBeNull() // original immutable
  })

  it('recover clears the deleted flags', () => {
    const p = Purchase.create({
      createdBy: u1, item: 'Coke', quantity: 1, unit: 'units',
      dailyConsumption: 1, consumers: [{ userId: u1, multiplier: 1 }], days: 1,
    })
    const deleted = p.softDelete({ by: u2, reason: 'oops' })
    const recovered = deleted.recover()
    expect(recovered.deleted).toBe(false)
    expect(recovered.toSnapshot().deletedBy).toBeNull()
    expect(recovered.toSnapshot().deleteReason).toBeNull()
  })

  it('starts with boughtQuantity 0', () => {
    const p = Purchase.create({
      createdBy: u1, item: 'Coke', quantity: 1, unit: 'units',
      dailyConsumption: 2, consumers: [{ userId: u1, multiplier: 1 }], days: 3,
    })
    expect(p.toSnapshot().boughtQuantity).toBe(0)
    expect(p.toSnapshot().purchased).toBe(false)
  })

  it('setBoughtQuantity clamps and derives purchased', () => {
    const p = Purchase.create({
      createdBy: u1, item: 'Coke', quantity: 1, unit: 'units',
      dailyConsumption: 2, consumers: [{ userId: u1, multiplier: 1 }], days: 3,
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

  it('assign purchased=true sets boughtQuantity to total', () => {
    const p = Purchase.create({
      createdBy: u1, item: 'Coke', quantity: 1, unit: 'units',
      dailyConsumption: 2, consumers: [{ userId: u1, multiplier: 1 }], days: 3,
    })
    expect(p.assign({ assignedTo: null, purchased: true }).toSnapshot().boughtQuantity).toBe(6)
    expect(p.assign({ assignedTo: null, purchased: false }).toSnapshot().boughtQuantity).toBe(0)
  })

  it('stores a trimmed group, null when blank', () => {
    const p = Purchase.create({
      createdBy: u1, item: 'Bread', quantity: 1, unit: 'units',
      dailyConsumption: 1, consumers: [{ userId: u1, multiplier: 1 }], days: 1,
      group: '  Cena sábado  ',
    })
    expect(p.toSnapshot().group).toBe('Cena sábado')
    const p2 = Purchase.create({
      createdBy: u1, item: 'Milk', quantity: 1, unit: 'units',
      dailyConsumption: 1, consumers: [{ userId: u1, multiplier: 1 }], days: 1,
      group: '   ',
    })
    expect(p2.toSnapshot().group).toBeNull()
  })

  it('edit can change the group', () => {
    const p = Purchase.create({
      createdBy: u1, item: 'Bread', quantity: 1, unit: 'units',
      dailyConsumption: 1, consumers: [{ userId: u1, multiplier: 1 }], days: 1,
    })
    const next = p.edit({
      item: 'Bread', quantity: 1, unit: 'units',
      dailyConsumption: 1, consumers: [{ userId: u1, multiplier: 1 }], days: 1,
      assignedTo: null, group: 'Comida domingo',
    })
    expect(next.toSnapshot().group).toBe('Comida domingo')
  })

  it('new purchase has null group by default', () => {
    const p = Purchase.create({
      createdBy: u1, item: 'XY', quantity: 1, unit: 'units',
      dailyConsumption: 1, consumers: [{ userId: u1, multiplier: 1 }], days: 1,
    })
    expect(p.toSnapshot().group).toBeNull()
  })

  it('a normal create has kind "buy"', () => {
    const p = Purchase.create({
      createdBy: u1, item: 'Coke', quantity: 1, unit: 'units',
      dailyConsumption: 1, consumers: [{ userId: u1, multiplier: 1 }], days: 1,
    })
    expect(p.kind).toBe('buy')
  })

  it('createBring produces a bring item', () => {
    const p = Purchase.createBring({
      createdBy: u1, item: 'Tortilla', quantity: 2, unit: 'units',
      group: 'Desayuno', broughtBy: u2,
    })
    expect(p.kind).toBe('bring')
    expect(p.toSnapshot().totalQuantity).toBe(2)
    expect(p.toSnapshot().quantity).toBe(2)
    expect(p.toSnapshot().consumers).toEqual([])
    expect(p.toSnapshot().assignedTo).toBe(u2)
    expect(p.toSnapshot().group).toBe('Desayuno')
    expect(p.toSnapshot().dailyConsumption).toBe(0)
  })

  it('createBring defaults bringer to null and validates quantity', () => {
    const p = Purchase.createBring({ createdBy: u1, item: 'Pan', quantity: 1, unit: 'units' })
    expect(p.toSnapshot().assignedTo).toBeNull()
    expect(() =>
      Purchase.createBring({ createdBy: u1, item: 'Pan', quantity: 0, unit: 'units' }),
    ).toThrow(/quantity/)
  })

  it('editBring updates fields and keeps kind "bring"', () => {
    const p = Purchase.createBring({
      createdBy: u1, item: 'Tortilla', quantity: 2, unit: 'units',
      group: 'Desayuno', broughtBy: u1,
    })
    const next = p.editBring({
      item: 'Tortilla de patatas', quantity: 3, unit: 'kg', group: 'Comida', broughtBy: u2,
    })
    expect(next.kind).toBe('bring')
    expect(next.id).toBe(p.id)
    expect(next.toSnapshot().item).toBe('Tortilla de patatas')
    expect(next.toSnapshot().quantity).toBe(3)
    expect(next.toSnapshot().totalQuantity).toBe(3)
    expect(next.toSnapshot().unit).toBe('kg')
    expect(next.toSnapshot().group).toBe('Comida')
    expect(next.toSnapshot().assignedTo).toBe(u2)
  })

  it('stores a trimmed subgroup, null when blank', () => {
    const p = Purchase.create({
      createdBy: u1, item: 'Bread', quantity: 1, unit: 'units',
      dailyConsumption: 1, consumers: [{ userId: u1, multiplier: 1 }], days: 1,
      group: 'Cena', subgroup: '  Entrantes  ',
    })
    expect(p.toSnapshot().subgroup).toBe('Entrantes')
    const p2 = Purchase.create({
      createdBy: u1, item: 'Milk', quantity: 1, unit: 'units',
      dailyConsumption: 1, consumers: [{ userId: u1, multiplier: 1 }], days: 1,
      group: 'Cena', subgroup: '   ',
    })
    expect(p2.toSnapshot().subgroup).toBeNull()
  })

  it('new purchase has null subgroup by default', () => {
    const p = Purchase.create({
      createdBy: u1, item: 'XY', quantity: 1, unit: 'units',
      dailyConsumption: 1, consumers: [{ userId: u1, multiplier: 1 }], days: 1,
    })
    expect(p.toSnapshot().subgroup).toBeNull()
  })

  it('edit can change the subgroup', () => {
    const p = Purchase.create({
      createdBy: u1, item: 'Bread', quantity: 1, unit: 'units',
      dailyConsumption: 1, consumers: [{ userId: u1, multiplier: 1 }], days: 1,
      group: 'Cena', subgroup: 'Entrantes',
    })
    const next = p.edit({
      item: 'Bread', quantity: 1, unit: 'units',
      dailyConsumption: 1, consumers: [{ userId: u1, multiplier: 1 }], days: 1,
      assignedTo: null, group: 'Cena', subgroup: 'Postres',
    })
    expect(next.toSnapshot().subgroup).toBe('Postres')
  })

  it('createBring stores a trimmed subgroup', () => {
    const p = Purchase.createBring({
      createdBy: u1, item: 'Tortilla', quantity: 2, unit: 'units',
      group: 'Desayuno', subgroup: '  Caliente ', broughtBy: u2,
    })
    expect(p.toSnapshot().subgroup).toBe('Caliente')
  })

  it('editBring can change the subgroup', () => {
    const p = Purchase.createBring({
      createdBy: u1, item: 'Tortilla', quantity: 2, unit: 'units',
      group: 'Desayuno', subgroup: 'Caliente', broughtBy: u1,
    })
    const next = p.editBring({
      item: 'Tortilla', quantity: 2, unit: 'units', group: 'Desayuno', subgroup: 'Frío', broughtBy: u2,
    })
    expect(next.toSnapshot().subgroup).toBe('Frío')
  })
})
