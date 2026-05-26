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

  it('starts with empty allergies and null optional fields', () => {
    const u = User.create({ name: 'John' })
    const snap = u.toSnapshot()
    expect(snap.allergies).toEqual([])
    expect(snap.email).toBeNull()
    expect(snap.phone).toBeNull()
    expect(snap.dietary).toBeNull()
    expect(snap.notes).toBeNull()
  })

  it('restores from legacy snapshot without profile fields', () => {
    const legacy = {
      id: '018f4a8e-0000-7000-8000-000000000001',
      name: 'Old',
      alias: null,
      joinedAt: '2026-01-01T00:00:00Z',
    }
    const u = User.restore(legacy as never)
    expect(u.allergies).toEqual([])
    expect(u.email).toBeNull()
  })

  it('withProfile updates only provided fields', () => {
    const u = User.create({ name: 'John', alias: 'cousin' })
    const next = u.withProfile({
      email: 'john@example.com',
      allergies: [{ name: 'gluten', severity: 'severe', notes: null }],
    })
    expect(next.email).toBe('john@example.com')
    expect(next.allergies).toHaveLength(1)
    expect(next.alias).toBe('cousin') // unchanged
  })

  it('withProfile rejects too many allergies', () => {
    const u = User.create({ name: 'John' })
    const tooMany = Array.from({ length: 21 }, () => ({ name: 'other' as const, severity: 'mild' as const, notes: null }))
    expect(() => u.withProfile({ allergies: tooMany })).toThrow(/20/)
  })

  it('withProfile validates each allergen', () => {
    const u = User.create({ name: 'John' })
    expect(() =>
      u.withProfile({ allergies: [{ name: 'unicorn' as never, severity: 'mild', notes: null }] }),
    ).toThrow(/name/)
  })

  it('withProfile rejects oversize free-text fields', () => {
    const u = User.create({ name: 'John' })
    expect(() => u.withProfile({ email: 'a'.repeat(101) })).toThrow(/email/)
    expect(() => u.withProfile({ phone: '9'.repeat(31) })).toThrow(/phone/)
    expect(() => u.withProfile({ dietary: 'x'.repeat(201) })).toThrow(/dietary/)
    expect(() => u.withProfile({ notes: 'x'.repeat(501) })).toThrow(/notes/)
  })

  it('defaults to adult kind', () => {
    expect(User.create({ name: 'John' }).toSnapshot().kind).toBe('adult')
  })

  it('accepts child kind', () => {
    expect(User.create({ name: 'Kid', kind: 'child' }).toSnapshot().kind).toBe('child')
  })

  it('rejects invalid kind', () => {
    expect(() => User.create({ name: 'John', kind: 'baby' as never })).toThrow(/kind/)
  })

  it('withProfile updates kind', () => {
    const u = User.create({ name: 'John' })
    expect(u.withProfile({ kind: 'child' }).kind).toBe('child')
  })

  it('withProfile updates the name', () => {
    const u = User.create({ name: 'John' })
    const next = u.withProfile({ name: 'Jonathan' })
    expect(next.name).toBe('Jonathan')
  })
  it('withProfile rejects an invalid name', () => {
    const u = User.create({ name: 'John' })
    expect(() => u.withProfile({ name: 'A' })).toThrow(/name/)
  })
  it('withProfile keeps the name when not provided', () => {
    const u = User.create({ name: 'John', alias: 'cousin' })
    expect(u.withProfile({ email: 'x@y.com' }).name).toBe('John')
  })

  it('restore defaults missing kind to adult', () => {
    const legacy = {
      id: '018f4a8e-0000-7000-8000-000000000001',
      name: 'Old',
      alias: null,
      joinedAt: '2026-01-01T00:00:00Z',
    }
    expect(User.restore(legacy as never).kind).toBe('adult')
  })
})
