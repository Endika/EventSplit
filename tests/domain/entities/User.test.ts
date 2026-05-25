import { describe, it, expect } from 'vitest'
import { User } from '@/domain/entities/User'
import { UserId } from '@/domain/value-objects/UserId'

describe('User', () => {
  it('rejects name shorter than 2 chars', () => {
    expect(() => User.create({ name: 'A' })).toThrow(/name/)
  })
  it('rejects name longer than 50 chars', () => {
    expect(() => User.create({ name: 'a'.repeat(51) })).toThrow(/name/)
  })
  it('rejects alias longer than 50 chars', () => {
    expect(() => User.create({ name: 'John', alias: 'a'.repeat(51) })).toThrow(/alias/)
  })
  it('builds displayName as "name (alias)" when alias present', () => {
    expect(User.create({ name: 'John', alias: 'cousin' }).displayName).toBe('John (cousin)')
  })
  it('builds displayName as name when alias missing', () => {
    expect(User.create({ name: 'John' }).displayName).toBe('John')
  })
  it('trims whitespace on name and alias', () => {
    expect(User.create({ name: '  John  ', alias: '  cousin  ' }).displayName).toBe('John (cousin)')
  })
  it('reuses existing id when restored from JSON', () => {
    const id = UserId.generate()
    const u = User.restore({ id: id.value, name: 'John', alias: null, joinedAt: '2026-01-01T00:00:00Z' })
    expect(u.id.value).toBe(id.value)
  })
})
