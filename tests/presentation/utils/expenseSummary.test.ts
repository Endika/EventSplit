import { describe, it, expect } from 'vitest'
import { buildExpenseSummary } from '@/presentation/utils/expenseSummary'
import { makeEvent, makeExpense, makeUser } from '../../support/eventFixtures'

const users = [
  makeUser('a1', { household: 'Casa' }),
  makeUser('a2', { household: 'Casa' }),
  makeUser('a3'),
  makeUser('kid', { kind: 'child', guardianId: 'a3', household: 'Casa' }),
  makeUser('dog', { kind: 'dog', household: 'Casa' }),
  makeUser('quiet'),
]

const event = makeEvent({
  users,
  expenses: [
    makeExpense('e1', { paidBy: 'a1', cents: 3000, splitAmong: ['a1', 'a3', 'kid'] }),
    makeExpense('e2', { paidBy: 'a3', cents: 600, splitAmong: ['a1', 'a2', 'a3', 'dog'] }),
    makeExpense('e3', { paidBy: 'a3', cents: 600, splitAmong: [] }),
    makeExpense('e4', { paidBy: 'a3', cents: 9999, deleted: true }),
  ],
})

const idsOf = (xs: { id: string }[]) => xs.map((x) => x.id)

describe('buildExpenseSummary for a participant', () => {
  const s = buildExpenseSummary(event, 'a3')

  it('finds my balance and adds the children I carry', () => {
    expect(s.mine).toMatchObject({ userId: 'a3', spentCents: 1200, balanceCents: -120 })
    expect(s.myCarried).toBe(-1240)
  })

  it('works from live expenses, never names a child in a transfer, and lists mine', () => {
    expect(s.result.totalCents).toBe(4200)
    expect(s.result.transfers).toEqual([
      { from: 'a3', to: 'a1', cents: 1240 },
      { from: 'quiet', to: 'a1', cents: 120 },
    ])
    expect(s.shown.map((b) => b.userId)).toEqual(['a1', 'a2', 'kid', 'quiet'])
    expect(idsOf(s.myExpenses)).toEqual(['e1', 'e2', 'e3'])
    expect(s.householdOf).toEqual({ a1: 'Casa', a2: 'Casa' })
  })
})

describe('buildExpenseSummary helpers', () => {
  const s = buildExpenseSummary(event, 'a3')

  it.each([
    ['a1', 'Casa', 'Casa'],
    ['a2', null, 'a2'],
    ['kid', null, 'kid'],
    ['ghost', null, '?'],
  ])('%s is represented by %s and called %s', (id, represented, party) => {
    expect(s.householdRepresentedBy(id)).toBe(represented)
    expect(s.partyName(id)).toBe(party)
    expect(s.nameOf(id)).toBe(id === 'ghost' ? '?' : id)
  })

  it('lists the paying members of a household', () => {
    expect(idsOf(s.householdMembers('Casa'))).toEqual(['a1', 'a2'])
    expect(s.householdMembers('Nope')).toEqual([])
  })

  it.each([
    [{ from: 'a1', to: 'a2' }, ['Casa']],
    [{ from: 'a2', to: 'a3' }, []],
  ])('householdSides %j -> %j', (tr, expected) => {
    expect(s.householdSides(tr)).toEqual(expected)
  })

  it('adds the carried children to a balance', () => {
    expect([s.memberBalance('a3'), s.memberBalance('ghost')]).toEqual([-1240, 0])
  })

  it('names carried children and guardians, empty when there are none', () => {
    expect([s.carriedNames('a3'), s.carriedNames('a1')]).toEqual(['kid', ''])
    expect([s.guardianNameOf('kid'), s.guardianNameOf('ghost')]).toEqual(['a3', ''])
  })
})

describe('buildExpenseSummary with a quiet group', () => {
  it('keeps a guardian who only carries a child', () => {
    const carrying = makeEvent({
      users,
      expenses: [makeExpense('e1', { paidBy: 'a1', cents: 2000, splitAmong: ['a1', 'kid'] })],
    })
    const s = buildExpenseSummary(carrying, 'a1')
    expect(s.shown.map((b) => b.userId)).toEqual(['kid', 'a3'].sort())
    expect(s.hiddenCount).toBe(2)
  })

  it('keeps someone who paid but ends square', () => {
    const square = makeEvent({
      users: [makeUser('a1'), makeUser('a2')],
      expenses: [makeExpense('e1', { paidBy: 'a2', cents: 1000, splitAmong: ['a2'] })],
    })
    const s = buildExpenseSummary(square, 'a1')
    expect(s.shown.map((b) => b.userId)).toEqual(['a2'])
    expect(s.hiddenCount).toBe(0)
  })
})

describe('buildExpenseSummary carrying several children', () => {
  it('names every child, comma separated', () => {
    const family = makeEvent({
      users: [
        makeUser('a1'),
        makeUser('k1', { kind: 'child', guardianId: 'a1' }),
        makeUser('k2', { kind: 'child', guardianId: 'a1' }),
      ],
    })
    expect(buildExpenseSummary(family, 'a1').carriedNames('a1')).toBe('k1, k2')
  })
})

describe('buildExpenseSummary without a known viewer', () => {
  it('shows everybody and no personal figure', () => {
    const s = buildExpenseSummary(event, undefined)
    expect(s.mine).toBeUndefined()
    expect(s.myCarried).toBe(0)
    expect(s.myExpenses).toEqual([])
    expect(s.shown).toHaveLength(5)
  })
})

describe('buildExpenseSummary myExpenses', () => {
  it('falls back to every payer when the split holds only dogs or strangers', () => {
    const e = makeEvent({
      users,
      expenses: [
        makeExpense('dogs', { paidBy: 'a1', splitAmong: ['dog'] }),
        makeExpense('other', { paidBy: 'a1', splitAmong: ['a1'] }),
      ],
    })
    expect(idsOf(buildExpenseSummary(e, 'a2').myExpenses)).toEqual(['dogs'])
  })
})

describe('buildExpenseSummary settlement', () => {
  const transfers = [
    { from: 'a3', to: 'a1' },
    { from: 'quiet', to: 'a1' },
  ]
  const withSettled = (settledTransfers: { from: string; to: string }[]) =>
    buildExpenseSummary({ ...event, settledTransfers }, 'a3')

  it.each([
    { name: 'all transfers settled', settled: transfers, expected: true },
    { name: 'only one settled', settled: transfers.slice(0, 1), expected: false },
  ])('allSquare is $expected when $name', ({ settled, expected }) => {
    expect(withSettled(settled).allSquare).toBe(expected)
  })

  it('is not square when there is nothing to transfer', () => {
    const none = makeEvent({ users: [makeUser('a1')] })
    expect(buildExpenseSummary(none, 'a1').allSquare).toBe(false)
  })

  it('isSettled matches the exact direction', () => {
    const s = withSettled([{ from: 'a3', to: 'a1' }])
    expect(s.isSettled('a3', 'a1')).toBe(true)
    expect(s.isSettled('a1', 'a3')).toBe(false)
    expect(s.isSettled('a3', 'quiet')).toBe(false)
    expect(s.isSettled('quiet', 'a1')).toBe(false)
  })
})
