import { describe, it, expect } from 'vitest'
import { EventId } from '@/domain/value-objects/EventId'

describe('EventId', () => {
  it('rejects uppercase', () => {
    expect(() => EventId.of('ABC123x')).toThrow(/format/)
  })

  it('takes exactly seven lowercase letters or digits', () => {
    expect(EventId.of('abc1234').value).toBe('abc1234')
    expect(() => EventId.of('abc12345')).toThrow(/format/)
    expect(() => EventId.of('xabc1234')).toThrow(/format/)
  })
})
