import { describe, it, expect } from 'vitest'
import { digitsOnly, hasMinPinLength, isValidPinLength } from '@/presentation/utils/pinInput'

describe('isValidPinLength', () => {
  it.each([
    ['123', false],
    ['1234', true],
    ['123456', true],
    ['1234567', false],
  ])('%s -> %s', (pin, expected) => {
    expect(isValidPinLength(pin)).toBe(expected)
  })
})

describe('hasMinPinLength', () => {
  it.each([['123', false]])('%s -> %s', (pin, expected) => {
    expect(hasMinPinLength(pin)).toBe(expected)
  })
})

describe('digitsOnly', () => {
  it('drops everything that is not a digit', () => {
    expect(digitsOnly('a1-2 b3')).toBe('123')
  })
})
