import { describe, it, expect } from 'vitest'
import { LocationSchema } from '@/application/dtos/EditEventDetailsDTO'
import { SetAvailabilityMetaSchema } from '@/application/dtos/SetAvailabilityMetaDTO'
import { SetDayOptionsSchema } from '@/application/dtos/SetDayOptionsDTO'
import { SetEditPinSchema } from '@/application/dtos/SetEditPinDTO'

const eventId = 'abc123x'
const userId = '3f8b6c1e-9a3a-4f0e-8d8e-0a1b2c3d4e5f'

describe('DTO-specific rules', () => {
  it('SetDayOptions rejects the batch when any single option is invalid', () => {
    const valid = { start: '2026-06-05', end: '2026-06-06', note: null }
    const backwards = { start: '2026-06-09', end: '2026-06-08', note: null }
    const parse = (options: unknown[]) => SetDayOptionsSchema.safeParse({ eventId, options })
    expect(parse([valid]).success).toBe(true)
    expect(parse([valid, backwards]).success).toBe(false)
    expect(parse([backwards]).success).toBe(false)
  })

  it.each([['1234567', false]])(
    'SetEditPin reads the PIN %j: valid is %s, for both pin and currentPin',
    (pin, ok) => {
      const parse = (fields: object) => SetEditPinSchema.safeParse({ eventId, userId, ...fields })
      expect(parse({ pin }).success).toBe(ok)
      expect(parse({ pin: null, currentPin: pin }).success).toBe(ok)
    },
  )

  it('a location name is trimmed and kept between 2 and 100 characters', () => {
    expect(LocationSchema.parse({ name: '  Casa  ' }).name).toBe('Casa')
    expect(LocationSchema.safeParse({ name: 'x' }).success).toBe(false)
    expect(LocationSchema.safeParse({ name: ' ' + 'x'.repeat(100) }).success).toBe(true)
    expect(LocationSchema.safeParse({ name: 'x'.repeat(101) }).success).toBe(false)
  })

  it('an availability note is trimmed and capped at 200 characters', () => {
    const parse = (note: string | null) =>
      SetAvailabilityMetaSchema.safeParse({ eventId, userId, note, chosenOptions: [] })
    expect(parse('  voy tarde  ').data?.note).toBe('voy tarde')
    expect(parse('x'.repeat(200)).success).toBe(true)
    expect(parse('x'.repeat(201)).success).toBe(false)
    expect(parse(null).success).toBe(true)
  })
})
