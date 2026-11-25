import { describe, it, expect } from 'vitest'
import { Money } from '@/domain/value-objects/Money'

describe('Money', () => {
  it('rejects negative amounts', () => {
    expect(() => Money.fromEuros(-1)).toThrow(/non-negative/)
  })
  it('rejects more than 2 decimals', () => {
    expect(() => Money.fromEuros(1.234)).toThrow(/2 decimals/)
  })
  it('rejects amounts above 999_999.99', () => {
    expect(() => Money.fromEuros(1_000_000)).toThrow(/maximum/)
    expect(() => Money.fromCents(100_000_000)).toThrow(/maximum/)
    expect(Money.fromCents(99_999_999).cents).toBe(99_999_999)
    expect(Money.fromEuros(999_999.99).cents).toBe(99_999_999)
  })
  it.each([NaN])('rejects the non-finite amount %s', (euros) => {
    expect(() => Money.fromEuros(euros)).toThrow(/finite/)
  })
  it.each([-1])('rejects %s as a cent count', (cents) => {
    expect(() => Money.fromCents(cents)).toThrow(/cents/)
  })
  it('subtracts, flooring at zero', () => {
    expect(Money.fromCents(500).minus(Money.fromCents(200)).cents).toBe(300)
    expect(Money.fromCents(200).minus(Money.fromCents(500)).cents).toBe(0)
  })
  it.each([0])('refuses to split into %s shares', (n) => {
    expect(() => Money.fromCents(100).splitInto(n)).toThrow(/split count/)
  })
  it('sums without floating-point drift', () => {
    const a = Money.fromEuros(0.1)
    const b = Money.fromEuros(0.2)
    expect(a.plus(b).toEuros()).toBe(0.3)
  })
  it('divides into equal shares with rounding', () => {
    const shares = Money.fromEuros(10).splitInto(3)
    expect(shares.map((m) => m.cents)).toEqual([334, 333, 333])
    expect(shares.reduce((s, m) => s.plus(m), Money.fromEuros(0)).cents).toBe(1000)
  })
})
