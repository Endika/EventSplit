import { describe, it, expect } from 'vitest'
import {
  allConsumers,
  allergenLabel,
  buyConsumers,
  existingGroups,
  existingSubgroups,
  groupFields,
  initialConsumers,
  isSubmitBlocked,
  isValidConsumption,
  toggleConsumer,
  totalPreview,
} from '@/presentation/utils/purchaseForm'
import { makePurchase, makeUser } from '../../support/eventFixtures'

const users = [makeUser('a'), makeUser('kid', { kind: 'child' }), makeUser('dog', { kind: 'dog' })]

describe('existingGroups', () => {
  it('lists the distinct groups of live purchases, sorted', () => {
    const purchases = [
      makePurchase('1', { group: 'Food' }),
      makePurchase('2', { group: 'Drinks' }),
      makePurchase('3', { group: 'Food' }),
      makePurchase('4'),
      makePurchase('5', { group: 'Gone', deleted: true }),
      makePurchase('6', { group: '' }),
    ]
    expect(existingGroups(purchases)).toEqual(['Drinks', 'Food'])
  })
})

describe('existingSubgroups', () => {
  const purchases = [
    makePurchase('1', { group: 'Food', subgroup: 'Fruit' }),
    makePurchase('2', { group: 'Food', subgroup: 'Bread' }),
    makePurchase('3', { group: 'Food', subgroup: 'Fruit' }),
    makePurchase('4', { group: 'Food' }),
    makePurchase('5', { group: 'Drinks', subgroup: 'Beer' }),
    makePurchase('6', { group: 'Food', subgroup: 'Gone', deleted: true }),
  ]

  it.each([
    { group: 'Food', expected: ['Bread', 'Fruit'] },
    { group: '', expected: [] },
  ])('inside $group', ({ group, expected }) => {
    expect(existingSubgroups(purchases, group)).toEqual(expected)
  })
})

describe('initialConsumers', () => {
  it('pre-selects everyone but dogs at their default multiplier for a new purchase', () => {
    expect(initialConsumers(users)).toEqual({ a: 1, kid: 0.5 })
  })

  it('keeps the saved consumers when editing', () => {
    const consumers = [
      { userId: 'dog', multiplier: 2 },
      { userId: 'a', multiplier: 0.25 },
    ]
    expect(initialConsumers(users, { consumers })).toEqual({ dog: 2, a: 0.25 })
  })
})

describe('allConsumers', () => {
  it('includes dogs at their default multiplier', () => {
    expect(allConsumers(users)).toEqual({ a: 1, kid: 0.5, dog: 1 })
  })
})

describe('toggleConsumer', () => {
  it.each<{
    name: string
    current: Record<string, number>
    id: string
    expected: Record<string, number>
  }>([
    { name: 'adds a child at half', current: {}, id: 'kid', expected: { kid: 0.5 } },
    { name: 'adds an unknown id at 1', current: {}, id: 'zz', expected: { zz: 1 } },
    { name: 'removes a zero multiplier too', current: { a: 0 }, id: 'a', expected: {} },
  ])('$name', ({ current, id, expected }) => {
    expect(toggleConsumer(current, id, users)).toEqual(expected)
  })

  it('does not mutate the input', () => {
    const current = { a: 1 }
    toggleConsumer(current, 'a', users)
    expect(current).toEqual({ a: 1 })
  })
})

describe('groupFields', () => {
  it.each([
    { group: '  Food ', subgroup: ' Fruit  ', expected: { group: 'Food', subgroup: 'Fruit' } },
    { group: 'Food', subgroup: '   ', expected: { group: 'Food', subgroup: null } },
    { group: '  ', subgroup: 'Fruit', expected: { group: null, subgroup: null } },
  ])('$group / $subgroup', ({ group, subgroup, expected }) => {
    expect(groupFields(group, subgroup)).toEqual(expected)
  })
})

describe('buyConsumers', () => {
  it('a shared staple goes to everyone but dogs, once each', () => {
    expect(buyConsumers(true, users, { dog: 3 })).toEqual([
      { userId: 'a', multiplier: 1 },
      { userId: 'kid', multiplier: 1 },
    ])
  })

  it('otherwise it is the chosen consumers', () => {
    expect(buyConsumers(false, users, { dog: 3, a: 0.5 })).toEqual([
      { userId: 'dog', multiplier: 3 },
      { userId: 'a', multiplier: 0.5 },
    ])
  })
})

describe('isValidConsumption', () => {
  it.each([
    [1, 3, true],
    [NaN, 3, false],
    [1, 0, false],
    [1, 1.5, false],
  ])('daily %s for %s days -> %s', (daily, days, expected) => {
    expect(isValidConsumption(daily, days)).toBe(expected)
  })
})

describe('totalPreview', () => {
  it.each<{
    consumers: Record<string, number>
    daily: number
    days: number
    expected: number | null
  }>([
    { consumers: { a: 1, b: 2 }, daily: 1.5, days: 2, expected: 9 },
    { consumers: { a: 1 }, daily: 0.333, days: 1, expected: 0.33 },
    { consumers: {}, daily: 1, days: 3, expected: null },
  ])('$consumers daily $daily x $days -> $expected', ({ consumers, daily, days, expected }) => {
    expect(totalPreview(consumers, daily, days)).toBe(expected)
  })
})

describe('allergenLabel', () => {
  it.each([
    { a: { name: 'gluten', notes: 'trace' }, expected: 'Gluten (trace)' },
    { a: { name: 'other', notes: 'kiwi' }, expected: 'kiwi' },
    { a: { name: 'other', notes: '' }, expected: 'Gluten' },
  ])('$a', ({ a, expected }) => {
    expect(allergenLabel(a, 'Gluten')).toBe(expected)
  })
})

describe('isSubmitBlocked', () => {
  const ok = {
    busy: false,
    online: true,
    isEdit: false,
    item: 'Beer',
    mode: 'buy' as const,
    isSingle: false,
    consumerCount: 2,
  }

  it.each([
    { name: 'busy', change: { busy: true } },
    { name: 'a new purchase without an item', change: { item: '' } },
    { name: 'a buy without consumers', change: { consumerCount: 0 } },
  ])('blocks when $name', ({ change }) => {
    expect(isSubmitBlocked({ ...ok, ...change })).toBe(true)
  })

  it.each([
    { name: 'an edit without an item', change: { isEdit: true, item: '' } },
    { name: 'a bring without consumers', change: { mode: 'bring' as const, consumerCount: 0 } },
  ])('allows $name', ({ change }) => {
    expect(isSubmitBlocked({ ...ok, ...change })).toBe(false)
  })
})
