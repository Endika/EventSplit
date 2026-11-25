import { describe, it, expect } from 'vitest'
import {
  canBeAssigned,
  canBecome,
  defaultMultiplier,
  isDefaultConsumer,
} from '@/domain/services/participantRoles'

describe('participantRoles', () => {
  it('keeps children and dogs out of being assigned a purchase', () => {
    expect(canBeAssigned('adult')).toBe(true)
    expect(canBeAssigned('child')).toBe(false)
    expect(canBeAssigned('dog')).toBe(false)
  })

  it('gives children half a ration and dogs a full one', () => {
    expect(defaultMultiplier('adult')).toBe(1)
    expect(defaultMultiplier('child')).toBe(0.5)
    expect(defaultMultiplier('dog')).toBe(1)
  })

  it('preselects everyone but the dog as a consumer', () => {
    expect(isDefaultConsumer('adult')).toBe(true)
    expect(isDefaultConsumer('child')).toBe(true)
    expect(isDefaultConsumer('dog')).toBe(false)
  })

  it.each([
    ['a dog who paid nothing', 'dog', [{ paidBy: 'other', deleted: false }], true],
  ] as const)('canBecome: %s', (_label, kind, expenses, expected) => {
    expect(canBecome(kind, { userId: 'me', expenses })).toBe(expected)
  })
})
