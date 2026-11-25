import { describe, it, expect } from 'vitest'
import { userLabel, userLabelOf, userName } from '@/presentation/utils/userLabel'

const users = [
  { id: 'a', name: 'Ane', alias: null },
  { id: 'b', name: 'Iker', alias: 'Ike' },
]

describe('user labels', () => {
  it('shows the alias in parentheses only when there is one', () => {
    expect(userLabel(users[0]!)).toBe('Ane')
    expect(userLabel(users[1]!)).toBe('Iker (Ike)')
  })

  it('looks a name up by id, with ? for strangers', () => {
    expect(users.map((u) => userName(users, u.id))).toEqual(['Ane', 'Iker'])
    expect(userName(users, 'zz')).toBe('?')
    expect(userLabelOf(users, 'zz')).toBe('?')
  })
})
