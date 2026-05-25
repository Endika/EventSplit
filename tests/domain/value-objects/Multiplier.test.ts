import { describe, it, expect } from 'vitest'
import { Multiplier } from '@/domain/value-objects/Multiplier'

describe('Multiplier', () => {
  it('rejects negative values', () => {
    expect(() => Multiplier.of(-0.5)).toThrow(/range/)
  })
  it('rejects values above 10', () => {
    expect(() => Multiplier.of(10.5)).toThrow(/range/)
  })
  it('rejects fractions that are not multiples of 0.5', () => {
    expect(() => Multiplier.of(1.3)).toThrow(/step/)
  })
  it('accepts valid steps', () => {
    expect(Multiplier.of(0).value).toBe(0)
    expect(Multiplier.of(1.5).value).toBe(1.5)
    expect(Multiplier.of(10).value).toBe(10)
  })
})
