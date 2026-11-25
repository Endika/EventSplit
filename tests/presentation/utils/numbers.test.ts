import { describe, it, expect } from 'vitest'
import { isPositiveNumber, round2 } from '@/presentation/utils/numbers'

describe('isPositiveNumber', () => {
  it.each([
    [0.01, true],
    [0, false],
    [Infinity, false],
  ])('%s -> %s', (n, expected) => {
    expect(isPositiveNumber(n)).toBe(expected)
  })
})

describe('round2', () => {
  it('rounds to two decimals', () => {
    expect([round2(1.234), round2(1.236), round2(2)]).toEqual([1.23, 1.24, 2])
  })
})
