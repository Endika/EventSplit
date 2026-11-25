import { describe, it, expect } from 'vitest'
import { ExpenseSplitter } from '@/domain/services/ExpenseSplitter'
import { Money } from '@/domain/value-objects/Money'

describe('ExpenseSplitter', () => {
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

  it('gives the rounding leftovers to the least loaded, ties going to the earlier in the list', () => {
    const cents = (n: number) => Money.fromCents(n)
    const result = ExpenseSplitter.compute({
      participantIds: ['p', 'a', 'b', 'c'],
      expenses: [
        { paidBy: 'p', amount: cents(301), splitAmong: ['a', 'b', 'c'] }, // a
        { paidBy: 'p', amount: cents(201), splitAmong: ['b', 'c'] }, // b
        { paidBy: 'p', amount: cents(201), splitAmong: ['a', 'b'] }, // a, tied with b
        { paidBy: 'p', amount: cents(302), splitAmong: ['a', 'b', 'c'] }, // c, then b
        { paidBy: 'p', amount: cents(5), splitAmong: ['a', 'b', 'c'] }, // c, then a, tied with b
      ],
    })
    expect(result.balances.map((b) => b.balanceCents)).toEqual([1010, -304, -403, -303])
  })

  it('gives no balance to an empty group, whatever was spent', () => {
    expect(
      ExpenseSplitter.compute({
        participantIds: [],
        expenses: [{ paidBy: 'a', amount: Money.fromCents(500) }],
      }),
    ).toEqual({ totalCents: 0, balances: [], transfers: [] })
  })

  it('settles the biggest debts first and moves on only when a creditor is paid off', () => {
    // a is owed 25, b is owed 35; c owes 10, d 30, e 20.
    const spent = (paidBy: string, euros: number, forUser: string) => ({
      paidBy,
      amount: Money.fromEuros(euros),
      splitAmong: [forUser],
    })
    const result = ExpenseSplitter.compute({
      participantIds: ['a', 'b', 'c', 'd', 'e'],
      expenses: [spent('a', 25, 'd'), spent('b', 10, 'c'), spent('b', 5, 'd'), spent('b', 20, 'e')],
    })
    expect(result.transfers).toEqual([
      { from: 'd', to: 'b', cents: 3000 },
      { from: 'e', to: 'b', cents: 500 },
      { from: 'e', to: 'a', cents: 1500 },
      { from: 'c', to: 'a', cents: 1000 },
    ])
  })

  it('survives an expense paid by somebody who is no longer a participant', () => {
    const result = ExpenseSplitter.compute({
      participantIds: ['a', 'b', 'c'],
      expenses: [
        { paidBy: 'a', amount: Money.fromCents(3000) },
        { paidBy: 'gone', amount: Money.fromCents(3000) },
      ],
    })
    expect(result.transfers).toEqual([{ from: 'b', to: 'a', cents: 1000 }])
    expect(result.totalCents).toBe(6000)
  })
})
