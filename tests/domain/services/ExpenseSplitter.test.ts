import { describe, it, expect } from 'vitest'
import { ExpenseSplitter } from '@/domain/services/ExpenseSplitter'
import { Money } from '@/domain/value-objects/Money'

describe('ExpenseSplitter', () => {
  it('returns zero balances for empty input', () => {
    const result = ExpenseSplitter.compute({
      participantIds: ['a', 'b'],
      expenses: [],
    })
    expect(result.totalCents).toBe(0)
    expect(result.balances).toEqual([
      { userId: 'a', spentCents: 0, balanceCents: 0 },
      { userId: 'b', spentCents: 0, balanceCents: 0 },
    ])
    expect(result.transfers).toEqual([])
  })

  it('balances when one person paid all', () => {
    const result = ExpenseSplitter.compute({
      participantIds: ['a', 'b'],
      expenses: [{ paidBy: 'a', amount: Money.fromEuros(20) }],
    })
    expect(result.balances).toEqual([
      { userId: 'a', spentCents: 2000, balanceCents: 1000 },
      { userId: 'b', spentCents: 0, balanceCents: -1000 },
    ])
    expect(result.transfers).toEqual([{ from: 'b', to: 'a', cents: 1000 }])
  })

  it('matches the spec example (5 friends, EUR 400)', () => {
    const result = ExpenseSplitter.compute({
      participantIds: ['john', 'maria', 'pedro', 'ana', 'carlos'],
      expenses: [
        { paidBy: 'john',   amount: Money.fromEuros(120) },
        { paidBy: 'maria',  amount: Money.fromEuros(80) },
        { paidBy: 'pedro',  amount: Money.fromEuros(90) },
        { paidBy: 'ana',    amount: Money.fromEuros(50) },
        { paidBy: 'carlos', amount: Money.fromEuros(60) },
      ],
    })
    expect(result.totalCents).toBe(40000)
    const byId = Object.fromEntries(result.balances.map((b) => [b.userId, b.balanceCents]))
    expect(byId.john).toBe(4000)
    expect(byId.maria).toBe(0)
    expect(byId.pedro).toBe(1000)
    expect(byId.ana).toBe(-3000)
    expect(byId.carlos).toBe(-2000)
    const totalDebt = result.transfers.reduce((s, t) => s + t.cents, 0)
    expect(totalDebt).toBe(5000)
  })

  it('handles uneven split with cent-perfect totals', () => {
    const result = ExpenseSplitter.compute({
      participantIds: ['a', 'b', 'c'],
      expenses: [{ paidBy: 'a', amount: Money.fromEuros(10) }],
    })
    const totalBalance = result.balances.reduce((s, b) => s + b.balanceCents, 0)
    expect(totalBalance).toBe(0)
  })
})
