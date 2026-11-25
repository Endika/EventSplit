import { describe, it, expect } from 'vitest'
import { UserId } from '@/domain/value-objects/UserId'

describe('UserId', () => {
  const valid = '019e6345-9df0-7541-8d82-87fb7667b90b'

  it.each(['not-a-uuid', `x${valid}`, `${valid}x`])('rejects %s', (value) => {
    expect(() => UserId.of(value)).toThrow()
  })
})
