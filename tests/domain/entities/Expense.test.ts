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
    const next = e.edit({ paidBy: u2, amount: Money.fromEuros(25.5), description: 'Bread and milk' })
    expect(next.toSnapshot().cents).toBe(2550)
    expect(next.toSnapshot().paidBy).toBe(u2)
    expect(next.toSnapshot().description).toBe('Bread and milk')
    expect(e.toSnapshot().cents).toBe(1000) // original immutable
  })

  it('edit rejects amount <= 0 and bad description', () => {
    const e = Expense.create({ paidBy: u1, amount: Money.fromEuros(10), description: 'Bread' })
    expect(() => e.edit({ paidBy: u1, amount: Money.fromEuros(0), description: 'Bread' })).toThrow(/amount/)
    expect(() => e.edit({ paidBy: u1, amount: Money.fromEuros(5), description: 'ab' })).toThrow(/description/)
  })

  it('softDelete marks deleted with editor', () => {
    const e = Expense.create({ paidBy: u1, amount: Money.fromEuros(10), description: 'Bread' })
    const deleted = e.softDelete({ by: u2 })
    expect(deleted.toSnapshot().deleted).toBe(true)
    expect(deleted.toSnapshot().deletedBy).toBe(u2)
    expect(e.toSnapshot().deleted).toBe(false) // original immutable
  })
})
