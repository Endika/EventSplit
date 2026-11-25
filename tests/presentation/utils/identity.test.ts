import { describe, it, expect } from 'vitest'
import { toCurrentUser, toIdentity } from '@/presentation/utils/identity'

describe('identity', () => {
  it('keeps only id, name and alias, and does not touch its input', () => {
    const full = { id: 'u1', name: 'Iker', alias: 'Ike', email: 'a@b.c' }
    expect(toIdentity(full)).toStrictEqual({ id: 'u1', name: 'Iker', alias: 'Ike' })
    expect(full.email).toBe('a@b.c')
  })

  it.each([[null, 'Iker']])('labels alias %s as %s', (alias, displayName) => {
    expect(toCurrentUser({ id: 'u1', name: 'Iker', alias })).toStrictEqual({
      id: 'u1',
      name: 'Iker',
      alias,
      displayName,
    })
  })
})
