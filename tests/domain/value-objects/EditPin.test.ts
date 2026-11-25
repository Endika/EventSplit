import { describe, it, expect } from 'vitest'
import { EditPin } from '@/domain/value-objects/EditPin'

describe('EditPin.validateFormat', () => {
  it.each(['1234'])('accepts %s', (pin) => {
    expect(() => EditPin.validateFormat(pin)).not.toThrow()
  })

  it.each(['1234567'])('rejects %j', (pin) => {
    expect(() => EditPin.validateFormat(pin)).toThrow()
  })
})
