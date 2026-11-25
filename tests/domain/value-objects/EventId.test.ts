import { describe, it, expect } from 'vitest'
import { EventId } from '@/domain/value-objects/EventId'

describe('EventId', () => {
  it('rejects uppercase', () => {
    expect(() => EventId.of('ABC123x')).toThrow(/format/)
  })
})
