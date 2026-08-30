import { describe, it, expect } from 'vitest'
import { pickTableOptions } from '@/domain/services/pickTableOptions'
import type { DayOption } from '@/domain/value-objects/DayOption'

const o = (s: string, e = s): DayOption => ({ start: s, end: e, note: null })

const nine = [
  o('2026-06-01'),
  o('2026-06-02'),
  o('2026-06-03'),
  o('2026-06-04'),
  o('2026-06-05'),
  o('2026-06-06'),
  o('2026-06-07'),
  o('2026-06-08'),
  o('2026-06-09'),
]

describe('pickTableOptions', () => {
  it('returns them all when there are 7 or fewer', () => {
    expect(pickTableOptions(nine.slice(0, 7), [0, 0, 0, 0, 0, 0, 0], [])).toEqual([
      0, 1, 2, 3, 4, 5, 6,
    ])
  })

  it('keeps the 7 most voted, in chronological order', () => {
    const counts = [0, 5, 0, 4, 3, 2, 1, 6, 0]
    expect(pickTableOptions(nine, counts, [])).toEqual([0, 1, 3, 4, 5, 6, 7])
  })

  it('breaks ties by start date', () => {
    const counts = [1, 1, 1, 1, 1, 1, 1, 1, 1]
    expect(pickTableOptions(nine, counts, [])).toEqual([0, 1, 2, 3, 4, 5, 6])
  })

  it('always includes the chosen options, on top of the 7', () => {
    const counts = [0, 5, 0, 4, 3, 2, 1, 6, 0]
    const picked = pickTableOptions(nine, counts, ['2026-06-09..2026-06-09'])
    expect(picked).toContain(8)
    expect(picked).toEqual([0, 1, 3, 4, 5, 6, 7, 8])
  })

  it('a chosen option does not eat a top-voted slot', () => {
    const counts = [0, 5, 0, 4, 3, 2, 1, 6, 0]
    const withChosen = pickTableOptions(nine, counts, ['2026-06-09..2026-06-09'])
    const without = pickTableOptions(nine, counts, [])
    expect(without.every((i) => withChosen.includes(i))).toBe(true)
  })

  it('ignores a chosen key that is not an option', () => {
    expect(pickTableOptions(nine.slice(0, 2), [0, 0], ['2099-01-01..2099-01-01'])).toEqual([0, 1])
  })

  it('handles an empty option list', () => {
    expect(pickTableOptions([], [], [])).toEqual([])
  })
})
