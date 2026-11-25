import { describe, it, expect } from 'vitest'
import { isValidPinLength } from '@/presentation/utils/pinInput'

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
