import { describe, it, expect } from 'vitest'
import {
  live,
  pickAt,
  swapWithNeighbour,
  toggleInSet,
  trashed,
} from '@/presentation/utils/collections'

describe('toggleInSet', () => {
  it.each([
    { from: ['a'], value: 'b', to: ['a', 'b'] },
    { from: ['a', 'b'], value: 'b', to: ['a'] },
  ])('toggling $value in $from gives $to', ({ from, value, to }) => {
    expect([...toggleInSet(new Set(from), value)]).toEqual(to)
  })

  it('leaves the input set untouched', () => {
    const input = new Set(['a'])
    toggleInSet(input, 'b')
    expect([...input]).toEqual(['a'])
  })
})

describe('swapWithNeighbour', () => {
  it.each([
    { item: 'b', dir: 1, to: ['a', 'c', 'b'] },
    { item: 'a', dir: -1, to: null },
  ] as const)('moving $item by $dir gives $to', ({ item, dir, to }) => {
    expect(swapWithNeighbour(['a', 'b', 'c'], item, dir)).toEqual(to)
  })

  it('does not mutate the list', () => {
    const list = ['a', 'b']
    swapWithNeighbour(list, 'a', 1)
    expect(list).toEqual(['a', 'b'])
  })
})

describe('live and trashed', () => {
  const items = [
    { id: 1, deleted: false },
    { id: 2, deleted: true },
    { id: 3, deleted: false },
  ]

  it('splits them by the deleted flag', () => {
    expect(live(items).map((i) => i.id)).toEqual([1, 3])
    expect(trashed(items).map((i) => i.id)).toEqual([2])
  })
})

describe('pickAt', () => {
  it('takes the items at the indexes, in that order, skipping any that do not exist', () => {
    expect(pickAt(['a', 'b', 'c'], [2, 0, 7, -1])).toEqual(['c', 'a'])
  })
})
