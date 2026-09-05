import { describe, it, expect } from 'vitest'
import { Expense } from '@/domain/entities/Expense'
import { Money } from '@/domain/value-objects/Money'

const u1 = '019e6345-9df0-7541-8d82-87fb7667b90b'
const u2 = '019e63e3-0726-71e5-8906-c51fcc37dc58'

describe('Expense', () => {
  it('creates with deleted=false', () => {
    const e = Expense.create({ paidBy: u1, amount: Money.fromEuros(10), description: 'Bread' })
    expect(e.toSnapshot().deleted).toBe(false)
    expect(e.toSnapshot().cents).toBe(1000)
  })

  it('edit updates amount, description and payer', () => {
    const e = Expense.create({ paidBy: u1, amount: Money.fromEuros(10), description: 'Bread' })
    const next = e.edit({
      paidBy: u2,
      amount: Money.fromEuros(25.5),
      description: 'Bread and milk',
    })
    expect(next.toSnapshot().cents).toBe(2550)
    expect(next.toSnapshot().paidBy).toBe(u2)
    expect(next.toSnapshot().description).toBe('Bread and milk')
    expect(e.toSnapshot().cents).toBe(1000) // original immutable
  })

  it('edit rejects amount <= 0 and bad description', () => {
    const e = Expense.create({ paidBy: u1, amount: Money.fromEuros(10), description: 'Bread' })
    expect(() => e.edit({ paidBy: u1, amount: Money.fromEuros(0), description: 'Bread' })).toThrow(
      /amount/,
    )
    expect(() => e.edit({ paidBy: u1, amount: Money.fromEuros(5), description: 'ab' })).toThrow(
      /description/,
    )
  })

  it('softDelete marks deleted with editor', () => {
    const e = Expense.create({ paidBy: u1, amount: Money.fromEuros(10), description: 'Bread' })
    const deleted = e.softDelete({ by: u2 })
    expect(deleted.toSnapshot().deleted).toBe(true)
    expect(deleted.toSnapshot().deletedBy).toBe(u2)
    expect(e.toSnapshot().deleted).toBe(false) // original immutable
  })

  it('recover clears the deleted flags', () => {
    const e = Expense.create({ paidBy: u1, amount: Money.fromEuros(10), description: 'Bread' })
    const recovered = e.softDelete({ by: u2 }).recover()
    expect(recovered.toSnapshot().deleted).toBe(false)
    expect(recovered.toSnapshot().deletedBy).toBeNull()
  })

  it('create stores purchaseLinks and toSnapshot returns a copy', () => {
    const e = Expense.create({
      paidBy: u1,
      amount: Money.fromEuros(10),
      description: 'Shop',
      purchaseLinks: [{ purchaseId: 'p1', quantity: 6 }],
    })
    expect(e.toSnapshot().purchaseLinks).toEqual([{ purchaseId: 'p1', quantity: 6 }])
    const snap = e.toSnapshot()
    snap.purchaseLinks[0]!.quantity = 99
    expect(e.toSnapshot().purchaseLinks[0]!.quantity).toBe(6)
  })

  it('create rejects a link quantity <= 0', () => {
    expect(() =>
      Expense.create({
        paidBy: u1,
        amount: Money.fromEuros(10),
        description: 'Shop',
        purchaseLinks: [{ purchaseId: 'p1', quantity: 0 }],
      }),
    ).toThrow(/link quantity must be > 0/)
  })

  it('edit rejects a link quantity <= 0', () => {
    const e = Expense.create({ paidBy: u1, amount: Money.fromEuros(10), description: 'Shop' })
    expect(() =>
      e.edit({
        paidBy: u1,
        amount: Money.fromEuros(10),
        description: 'Shop',
        purchaseLinks: [{ purchaseId: 'p1', quantity: -2 }],
      }),
    ).toThrow(/link quantity must be > 0/)
  })

  it('edit with purchaseLinks replaces the previous set', () => {
    const e = Expense.create({
      paidBy: u1,
      amount: Money.fromEuros(10),
      description: 'Shop',
      purchaseLinks: [{ purchaseId: 'p1', quantity: 6 }],
    })
    const next = e.edit({
      paidBy: u1,
      amount: Money.fromEuros(10),
      description: 'Shop',
      purchaseLinks: [{ purchaseId: 'p2', quantity: 3 }],
    })
    expect(next.toSnapshot().purchaseLinks).toEqual([{ purchaseId: 'p2', quantity: 3 }])
  })

  it('edit without purchaseLinks keeps the existing links', () => {
    const e = Expense.create({
      paidBy: u1,
      amount: Money.fromEuros(10),
      description: 'Shop',
      purchaseLinks: [{ purchaseId: 'p1', quantity: 6 }],
    })
    const next = e.edit({ paidBy: u1, amount: Money.fromEuros(12), description: 'Shop' })
    expect(next.toSnapshot().purchaseLinks).toEqual([{ purchaseId: 'p1', quantity: 6 }])
  })
})
