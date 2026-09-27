import { describe, it, expect, beforeEach } from 'vitest'
import { UnlockedPinHolder } from '@/shared/di/UnlockedPinHolder'

describe('UnlockedPinHolder', () => {
  beforeEach(() => localStorage.clear())

  it('loads a hardcoded pin literal in the shape the current version writes', () => {
    localStorage.setItem('eventsplit.pin.lit0003', '1234')

    expect(new UnlockedPinHolder().get('lit0003')).toBe('1234')
  })

  it('forgets the pin when set to null', () => {
    const pins = new UnlockedPinHolder()
    pins.set('lit0004', '5678')
    pins.set('lit0004', null)

    expect(pins.get('lit0004')).toBeNull()
  })
})
