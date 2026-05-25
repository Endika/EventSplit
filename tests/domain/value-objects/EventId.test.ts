import { describe, it, expect } from 'vitest'
import { EventId } from '@/domain/value-objects/EventId'

describe('EventId', () => {
  it('accepts a 7-char lowercase alphanumeric id', () => {
    expect(EventId.of('abc123x').value).toBe('abc123x')
  })
  it('rejects uppercase', () => {
    expect(() => EventId.of('ABC123x')).toThrow(/format/)
  })
  it('rejects wrong length', () => {
    expect(() => EventId.of('abc12')).toThrow(/format/)
    expect(() => EventId.of('abc1234x')).toThrow(/format/)
  })
  it('rejects non-alphanumeric', () => {
    expect(() => EventId.of('abc-12x')).toThrow(/format/)
  })
  it('generates a valid id', () => {
    const id = EventId.generate()
    expect(/^[a-z0-9]{7}$/.test(id.value)).toBe(true)
  })
})
