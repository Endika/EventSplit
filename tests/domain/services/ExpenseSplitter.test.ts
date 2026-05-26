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

  it('splits an expense among only the selected participants', () => {
    const result = ExpenseSplitter.compute({
      participantIds: ['a', 'b', 'c'],
      expenses: [{ paidBy: 'a', amount: Money.fromEuros(30), splitAmong: ['a', 'b'] }],
    })
    // a paid 30, split between a and b → a owes 15, b owes 15
    // a's balance: 3000 - 1500 = 1500 (creditor)
    // b's balance: 0 - 1500 = -1500 (debtor)
    // c's balance: 0 - 0 = 0
    const byId = Object.fromEntries(result.balances.map((b) => [b.userId, b.balanceCents]))
    expect(byId.a).toBe(1500)
    expect(byId.b).toBe(-1500)
    expect(byId.c).toBe(0)
  })

  it('falls back to all participants when splitAmong is empty', () => {
    const result = ExpenseSplitter.compute({
      participantIds: ['a', 'b', 'c'],
      expenses: [{ paidBy: 'a', amount: Money.fromEuros(30), splitAmong: [] }],
    })
    const byId = Object.fromEntries(result.balances.map((b) => [b.userId, b.balanceCents]))
    expect(byId.a).toBe(2000)  // paid 3000, owes 1000
    expect(byId.b).toBe(-1000)
    expect(byId.c).toBe(-1000)
  })

  it('falls back to all when splitAmong is undefined', () => {
    const result = ExpenseSplitter.compute({
      participantIds: ['a', 'b'],
      expenses: [{ paidBy: 'a', amount: Money.fromEuros(10) }],
    })
    const byId = Object.fromEntries(result.balances.map((b) => [b.userId, b.balanceCents]))
    expect(byId.a).toBe(500)
    expect(byId.b).toBe(-500)
  })

  it('mixes whole-group and subset expenses', () => {
    const result = ExpenseSplitter.compute({
      participantIds: ['a', 'b', 'c', 'd'],
      expenses: [
        // a buys snacks for everyone (40)
        { paidBy: 'a', amount: Money.fromEuros(40) },
        // b takes c and d to dinner (60) — a not involved
        { paidBy: 'b', amount: Money.fromEuros(60), splitAmong: ['b', 'c', 'd'] },
      ],
    })
    const byId = Object.fromEntries(result.balances.map((b) => [b.userId, b.balanceCents]))
    // shares from snacks: each owes 10
    // shares from dinner: b/c/d each owes 20
    // a: paid 40, owes 10 → balance +30
    // b: paid 60, owes 10 + 20 = 30 → balance +30
    // c: paid 0, owes 10 + 20 = 30 → -30
    // d: paid 0, owes 10 + 20 = 30 → -30
    expect(byId.a).toBe(3000)
    expect(byId.b).toBe(3000)
    expect(byId.c).toBe(-3000)
    expect(byId.d).toBe(-3000)
  })

  it('balances always sum to zero with partial splits', () => {
    const result = ExpenseSplitter.compute({
      participantIds: ['a', 'b', 'c'],
      expenses: [
        { paidBy: 'a', amount: Money.fromEuros(10), splitAmong: ['a', 'b'] },
        { paidBy: 'b', amount: Money.fromEuros(7), splitAmong: ['b', 'c'] },
      ],
    })
    const sum = result.balances.reduce((s, b) => s + b.balanceCents, 0)
    expect(sum).toBe(0)
  })

  it('ignores invalid userIds in splitAmong (silently filtered)', () => {
    const result = ExpenseSplitter.compute({
      participantIds: ['a', 'b'],
      expenses: [{ paidBy: 'a', amount: Money.fromEuros(10), splitAmong: ['a', 'b', 'ghost'] }],
    })
    // ghost is dropped → splits among [a, b]
    const sum = result.balances.reduce((s, b) => s + b.balanceCents, 0)
    expect(sum).toBe(0)
    const byId = Object.fromEntries(result.balances.map((b) => [b.userId, b.balanceCents]))
    expect(byId.a).toBe(500)
    expect(byId.b).toBe(-500)
  })
})
