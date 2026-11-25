import { describe, it, expect } from 'vitest'
import { parseDecimal } from '@/shared/utils/parseDecimal'

describe('parseDecimal', () => {
  it.each([
    ['2.25', 2.25],
    ['1,5', 1.5],
    [' 1 234,5 ', 1234.5],
    ['', NaN],
    ['   ', NaN],
    ['abc', NaN],
  ])('%j → %d', (raw, expected) => {
    expect(parseDecimal(raw)).toBe(expected)
  })
})
