import { describe, it, expect } from 'vitest'
import { UserId } from '@/domain/value-objects/UserId'

describe('UserId', () => {
  it('generates a UUID v7', () => {
    const id = UserId.generate()
    expect(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id.value),
    ).toBe(true)
  })
  it('accepts a valid UUID v7 string', () => {
    const id = UserId.generate()
    expect(UserId.of(id.value).value).toBe(id.value)
  })
  it('rejects malformed strings', () => {
    expect(() => UserId.of('not-a-uuid')).toThrow(/format/)
  })
})
