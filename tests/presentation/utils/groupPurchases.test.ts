import { describe, it, expect } from 'vitest'
import {
  groupPurchases,
  movedGroupOrder,
  movedSubgroupOrder,
  sortByOrder,
  subCollapseKey,
} from '@/presentation/utils/groupPurchases'
import { makeEvent, makePurchase } from '../../support/eventFixtures'

describe('sortByOrder', () => {
  it.each([
    { keys: ['b', 'a', ''], order: [], expected: ['a', 'b', ''] },
    { keys: ['a', 'b', 'c'], order: ['c', 'a'], expected: ['c', 'a', 'b'] },
  ])('$keys with order $order -> $expected', ({ keys, order, expected }) => {
    expect(sortByOrder(keys, order)).toEqual(expected)
  })

  it('does not mutate the input', () => {
    const keys = ['b', 'a']
    sortByOrder(keys, [])
    expect(keys).toEqual(['b', 'a'])
  })
})

describe('groupPurchases', () => {
  const items = [
    makePurchase('p1', { group: 'Food', subgroup: 'Fruit' }),
    makePurchase('p2', { group: 'Drinks' }),
    makePurchase('p3', { group: 'Food', subgroup: 'Fruit' }),
    makePurchase('p4', { group: 'Food' }),
    makePurchase('p5'),
    makePurchase('p6', { group: 'Food', subgroup: 'Bread' }),
  ]
  const ids = (ps: { id: string }[]) => ps.map((p) => p.id)

  it('partitions by group then subgroup, alphabetical, empty last', () => {
    const grouped = groupPurchases(makeEvent(), items)
    expect(
      grouped.map((g) => ({
        group: g.group,
        items: ids(g.items),
        subgroups: g.subgroups.map((s) => ({ subgroup: s.subgroup, items: ids(s.items) })),
      })),
    ).toEqual([
      { group: 'Drinks', items: ['p2'], subgroups: [{ subgroup: '', items: ['p2'] }] },
      {
        group: 'Food',
        items: ['p1', 'p3', 'p4', 'p6'],
        subgroups: [
          { subgroup: 'Bread', items: ['p6'] },
          { subgroup: 'Fruit', items: ['p1', 'p3'] },
          { subgroup: '', items: ['p4'] },
        ],
      },
      { group: '', items: ['p5'], subgroups: [{ subgroup: '', items: ['p5'] }] },
    ])
  })

  it('honours the explicit group and subgroup order', () => {
    const event = makeEvent({ groupOrder: ['Food'], subgroupOrder: { Food: ['Fruit', 'Bread'] } })
    const grouped = groupPurchases(event, items)
    expect(grouped.map((g) => g.group)).toEqual(['Food', 'Drinks', ''])
    expect(grouped[0]!.subgroups.map((s) => s.subgroup)).toEqual(['Fruit', 'Bread', ''])
  })
})

describe('subCollapseKey', () => {
  it('joins group and subgroup with a NUL', () => {
    expect(subCollapseKey('a', 'b')).toBe('a' + String.fromCharCode(0) + 'b')
  })
})

describe('moved orders', () => {
  const grouped = groupPurchases(makeEvent(), [
    makePurchase('p1', { group: 'A', subgroup: 'x' }),
    makePurchase('p2', { group: 'A', subgroup: 'y' }),
    makePurchase('p3', { group: 'A' }),
    makePurchase('p4', { group: 'B' }),
    makePurchase('p5'),
  ])

  it.each([
    { group: 'A', dir: 1, expected: ['B', 'A'] },
    { group: 'nope', dir: 1, expected: null },
  ] as const)('group $group by $dir -> $expected', ({ group, dir, expected }) => {
    expect(movedGroupOrder(grouped, group, dir)).toEqual(expected)
  })

  it.each([
    { group: 'A', sub: 'y', dir: -1, expected: ['y', 'x'] },
    { group: 'A', sub: 'x', dir: -1, expected: null },
    { group: 'A', sub: 'y', dir: 1, expected: null },
    { group: 'nope', sub: 'x', dir: 1, expected: null },
  ] as const)('subgroup $sub of $group by $dir -> $expected', ({ group, sub, dir, expected }) => {
    expect(movedSubgroupOrder(grouped, group, sub, dir)).toEqual(expected)
  })
})
