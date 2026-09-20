import { describe, it, expect } from 'vitest'
import {
  canBeAssigned,
  canVote,
  defaultMultiplier,
  isDefaultConsumer,
  isSelectableAsSelf,
  payingUsers,
  paysExpenses,
} from '@/domain/services/participantRoles'

describe('participantRoles', () => {
  it('excludes only dogs from paying', () => {
    expect(paysExpenses('adult')).toBe(true)
    expect(paysExpenses('child')).toBe(true)
    expect(paysExpenses('dog')).toBe(false)
  })

  it('excludes only dogs from voting and from being picked as yourself', () => {
    expect([canVote('adult'), canVote('child'), canVote('dog')]).toEqual([true, true, false])
    expect([
      isSelectableAsSelf('adult'),
      isSelectableAsSelf('child'),
      isSelectableAsSelf('dog'),
    ]).toEqual([true, true, false])
  })

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

  it('payingUsers drops the dogs and keeps the order', () => {
    const users = [
      { id: 'a', kind: 'adult' as const },
      { id: 'd', kind: 'dog' as const },
      { id: 'c', kind: 'child' as const },
    ]
    expect(payingUsers(users).map((u) => u.id)).toEqual(['a', 'c'])
  })
})
