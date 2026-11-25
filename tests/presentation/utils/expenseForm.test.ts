import { describe, it, expect } from 'vitest'
import {
  affectedClashIds,
  clashNames,
  formSnapshot,
  initialLinks,
  initialSplit,
  parseAmountEuros,
  purchaseLinksPayload,
  toggleLink,
} from '@/presentation/utils/expenseForm'
import { makeExpense, makeUser } from '../../support/eventFixtures'

const users = [
  makeUser('a1'),
  makeUser('a2'),
  makeUser('kid', { kind: 'child' }),
  makeUser('dog', { kind: 'dog' }),
]

describe('initialSplit', () => {
  it.each([
    { name: 'adults only for a new expense', expense: undefined, expected: ['a1', 'a2'] },
    {
      name: 'every payer when the saved split is empty',
      expense: makeExpense('e', { splitAmong: [] }),
      expected: ['a1', 'a2', 'kid'],
    },
    {
      name: 'no stale ids and no dogs',
      expense: makeExpense('e', { splitAmong: ['a1', 'dog', 'ghost'] }),
      expected: ['a1'],
    },
  ])('$name', ({ expense, expected }) => {
    expect([...initialSplit(users, expense)]).toEqual(expected)
  })
})

describe('initialLinks', () => {
  it.each([
    { expense: undefined, expected: {} },
    { expense: makeExpense('e'), expected: {} },
    {
      expense: makeExpense('e', { purchaseLinks: [{ purchaseId: 'p1', quantity: 0.5 }] }),
      expected: { p1: '0.5' },
    },
    { expense: { purchaseLinks: undefined }, expected: {} },
  ])('$expected', ({ expense, expected }) => {
    expect(initialLinks(expense)).toEqual(expected)
  })
})

describe('formSnapshot', () => {
  const base = {
    paidBy: 'a1',
    amount: '10',
    description: 'Beer',
    splitAmong: new Set(['b', 'a']),
    links: { p2: '1', p1: '2' },
  }

  it('serialises every field', () => {
    expect(JSON.parse(formSnapshot(base))).toEqual({
      paidBy: 'a1',
      amount: '10',
      description: 'Beer',
      splitAmong: ['a', 'b'],
      links: [
        ['p1', '2'],
        ['p2', '1'],
      ],
    })
  })

  it.each([{ paidBy: 'a2' }, { splitAmong: new Set(['a']) }])('changes with %j', (change) => {
    expect(formSnapshot({ ...base, ...change })).not.toBe(formSnapshot(base))
  })
})

describe('affectedClashIds', () => {
  const settled = [{ from: 'a2', to: 'dog' }]

  it.each([
    { name: 'a split member is settled', paidBy: 'a1', split: ['a1', 'a2'], expected: ['a2'] },
    { name: 'nobody settled is involved', paidBy: 'a1', split: ['a1', 'kid'], expected: [] },
  ])('$name', ({ paidBy, split, expected }) => {
    expect(affectedClashIds(users, settled, paidBy, new Set(split))).toEqual(expected)
  })

  it('only counts people who are still in the event when everybody is ticked', () => {
    const staleSettled = [{ from: 'ghost', to: 'a1' }]
    expect(
      affectedClashIds(users.slice(0, 2), staleSettled, 'a1', new Set(['a1', 'a2', 'ghost'])),
    ).toEqual(['a1'])
  })
})

describe('clashNames', () => {
  it('labels each person, aliases included, and marks unknown ids', () => {
    const named = [
      { id: 'a', name: 'Ane', alias: null },
      { id: 'b', name: 'Iker', alias: 'Ike' },
    ]
    expect(clashNames(named, ['a', 'b', 'zz'])).toBe('Ane, Iker (Ike), ?')
  })
})

describe('toggleLink', () => {
  it.each<{
    name: string
    links: Record<string, string>
    remaining: number
    expected: Record<string, string>
  }>([
    { name: 'links one when nothing is missing', links: {}, remaining: 0, expected: { p: '1' } },
    { name: 'keeps a fractional remainder', links: {}, remaining: 0.5, expected: { p: '0.5' } },
    {
      name: 'unlinks a linked item',
      links: { p: '2', q: '1' },
      remaining: 3,
      expected: { q: '1' },
    },
  ])('$name', ({ links, remaining, expected }) => {
    expect(toggleLink(links, 'p', remaining)).toEqual(expected)
  })

  it('does not mutate the input', () => {
    const links = { p: '2' }
    toggleLink(links, 'p', 1)
    expect(links).toEqual({ p: '2' })
  })
})

describe('purchaseLinksPayload', () => {
  it('parses decimals with a comma and drops invalid quantities', () => {
    expect(purchaseLinksPayload({ a: '1,5', b: '0', c: '-1', d: 'x', e: '', f: '2' })).toEqual([
      { purchaseId: 'a', quantity: 1.5 },
      { purchaseId: 'f', quantity: 2 },
    ])
  })
})

describe('parseAmountEuros', () => {
  it.each([
    ['12,5', 12.5],
    ['0', null],
    ['Infinity', null],
  ])('%j -> %s', (raw, expected) => {
    expect(parseAmountEuros(raw)).toBe(expected)
  })
})
