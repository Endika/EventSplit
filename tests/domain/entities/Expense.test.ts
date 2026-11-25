import { describe, it, expect } from 'vitest'
import { Expense } from '@/domain/entities/Expense'
import { Money } from '@/domain/value-objects/Money'

const u1 = '019e6345-9df0-7541-8d82-87fb7667b90b'
const u2 = '019e63e3-0726-71e5-8906-c51fcc37dc58'

describe('Expense', () => {
  it('creates a live expense with trimmed description and empty defaults', () => {
    const e = Expense.create({
      paidBy: u1,
      amount: Money.fromEuros(10),
      description: '  Bread  ',
    })
    expect(e.toSnapshot()).toEqual({
      id: e.id,
      paidBy: u1,
      cents: 1000,
      currency: 'EUR',
      description: 'Bread',
      purchaseId: null,
      date: expect.any(String),
      createdAt: expect.any(String),
      splitAmong: [],
      purchaseLinks: [],
      deleted: false,
      deletedBy: null,
      deletedAt: null,
    })
    expect(e.paidBy).toBe(u1)
    expect(e.deleted).toBe(false)
    expect(e.amount.cents).toBe(1000)
  })

  it.each([
    ['3 chars', 'abc', true],
    ['100 chars', 'a'.repeat(100), true],
    ['101 chars', 'a'.repeat(101), false],
  ])('description of %s', (_label, description, ok) => {
    const create = () => Expense.create({ paidBy: u1, amount: Money.fromEuros(1), description })
    if (ok) expect(create).not.toThrow()
    else expect(create).toThrow(/description/)
  })

  it('create and edit reject amount <= 0 and bad description', () => {
    expect(() =>
      Expense.create({ paidBy: u1, amount: Money.fromEuros(0), description: 'Bread' }),
    ).toThrow()
    const e = Expense.create({ paidBy: u1, amount: Money.fromEuros(10), description: 'Bread' })
    expect(() => e.edit({ paidBy: u1, amount: Money.fromEuros(0), description: 'Bread' })).toThrow(
      /amount/,
    )
    expect(() => e.edit({ paidBy: u1, amount: Money.fromEuros(5), description: 'ab' })).toThrow(
      /description/,
    )
  })

  it('create stores purchaseLinks and toSnapshot returns a copy', () => {
    const e = Expense.create({
      paidBy: u1,
      amount: Money.fromEuros(10),
      description: 'Shop',
      purchaseLinks: [{ purchaseId: 'p1', quantity: 6 }],
    })
    expect(e.toSnapshot().purchaseLinks).toEqual([{ purchaseId: 'p1', quantity: 6 }])
    expect(e.purchaseLinks).toEqual([{ purchaseId: 'p1', quantity: 6 }])
    const snap = e.toSnapshot()
    snap.purchaseLinks[0]!.quantity = 99
    expect(e.toSnapshot().purchaseLinks[0]!.quantity).toBe(6)
  })

  it('create rejects a link quantity <= 0, an empty link purchaseId and duplicate splits', () => {
    const create = (extra: object) => () =>
      Expense.create({ paidBy: u1, amount: Money.fromEuros(10), description: 'Shop', ...extra })
    expect(create({ purchaseLinks: [{ purchaseId: 'p1', quantity: 0 }] })).toThrow(
      /link quantity must be > 0/,
    )
    expect(create({ purchaseLinks: [{ purchaseId: '', quantity: 1 }] })).toThrow(/purchaseId/)
    expect(create({ splitAmong: [u1, u1] })).toThrow(/unique/)
  })

  it('edit without purchaseLinks or purchaseId keeps the existing ones', () => {
    const e = Expense.create({
      paidBy: u1,
      amount: Money.fromEuros(10),
      description: 'Shop',
      purchaseId: 'p0',
      purchaseLinks: [{ purchaseId: 'p1', quantity: 6 }],
    })
    const next = e.edit({ paidBy: u1, amount: Money.fromEuros(12), description: 'Shop' })
    expect(next.toSnapshot().purchaseLinks).toEqual([{ purchaseId: 'p1', quantity: 6 }])
    expect(next.toSnapshot().purchaseId).toBe('p0')
  })

  it('restore backfills a legacy snapshot and keeps a soft-deleted one intact', () => {
    const legacy = {
      id: 'x-1',
      paidBy: u1,
      cents: 500,
      currency: 'EUR' as const,
      description: 'Old',
      purchaseId: null,
      date: '2026-01-01T00:00:00Z',
      createdAt: '2026-01-01T00:00:00Z',
    }
    const restored = Expense.restore(legacy)
    expect(restored.toSnapshot()).toEqual({
      ...legacy,
      splitAmong: [],
      purchaseLinks: [],
      deleted: false,
      deletedBy: null,
      deletedAt: null,
    })
    expect(restored.id).toBe('x-1')
    expect(restored.paidBy).toBe(u1)

    const deleted = {
      ...legacy,
      splitAmong: [u2],
      purchaseLinks: [{ purchaseId: 'p1', quantity: 2 }],
      deleted: true,
      deletedBy: u2,
      deletedAt: '2026-01-02T00:00:00Z',
    }
    const back = Expense.restore(deleted)
    expect(back.toSnapshot()).toEqual(deleted)
    expect(back.deleted).toBe(true)
  })
})
