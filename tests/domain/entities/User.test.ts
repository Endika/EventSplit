import { describe, it, expect } from 'vitest'
import { User } from '@/domain/entities/User'

describe('User', () => {
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

  it('withProfile rejects too many allergies', () => {
    const u = User.create({ name: 'John' })
    const tooMany = Array.from({ length: 21 }, () => ({
      name: 'other' as const,
      severity: 'mild' as const,
      notes: null,
    }))
    expect(() => u.withProfile({ allergies: tooMany })).toThrow(/20/)
  })

  it('withProfile validates each allergen', () => {
    const u = User.create({ name: 'John' })
    expect(() =>
      u.withProfile({ allergies: [{ name: 'unicorn' as never, severity: 'mild', notes: null }] }),
    ).toThrow(/name/)
  })

  it.each([
    ['alias of 50 chars', { alias: 'a'.repeat(50) }],
    [
      '20 allergies',
      {
        allergies: Array.from({ length: 20 }, () => ({
          name: 'egg' as const,
          severity: 'mild' as const,
          notes: null,
        })),
      },
    ],
  ])('withProfile accepts a %s', (_label, update) => {
    expect(() => User.create({ name: 'John' }).withProfile(update)).not.toThrow()
  })

  it('withProfile rejects an oversize alias and oversize allergen notes', () => {
    const u = User.create({ name: 'John' })
    expect(() => u.withProfile({ alias: 'a'.repeat(51) })).toThrow(/alias/)
    expect(() =>
      u.withProfile({ allergies: [{ name: 'egg', severity: 'mild', notes: 'n'.repeat(201) }] }),
    ).toThrow(/notes/)
  })

  it('withProfile trims text fields, clears them with null and keeps them when absent', () => {
    const u = User.create({ name: 'John' })
    const filled = u.withProfile({
      alias: ' cousin ',
      email: ' e@x.com ',
      phone: ' 600 ',
      dietary: ' vegan ',
      notes: ' hi ',
    })
    expect(filled).toMatchObject({
      alias: 'cousin',
      email: 'e@x.com',
      phone: '600',
      dietary: 'vegan',
      notes: 'hi',
    })
    expect(filled.withProfile({}).toSnapshot()).toEqual(filled.toSnapshot())
    const blank = { alias: '  ', email: null, phone: '', dietary: null, notes: '  ' }
    expect(filled.withProfile(blank)).toMatchObject({
      alias: null,
      email: null,
      phone: null,
      dietary: null,
      notes: null,
    })
  })

  it('withProfile rejects oversize free-text fields', () => {
    const u = User.create({ name: 'John' })
    expect(() => u.withProfile({ email: 'a'.repeat(101) })).toThrow(/email/)
    expect(() => u.withProfile({ phone: '9'.repeat(31) })).toThrow(/phone/)
    expect(() => u.withProfile({ dietary: 'x'.repeat(201) })).toThrow(/dietary/)
    expect(() => u.withProfile({ notes: 'x'.repeat(501) })).toThrow(/notes/)
  })

  it('rejects invalid kind', () => {
    expect(() => User.create({ name: 'John', kind: 'baby' as never })).toThrow(/kind/)
    expect(() => User.create({ name: 'John' }).withProfile({ kind: 'baby' as never })).toThrow(
      /kind/,
    )
  })

  describe('guardian', () => {
    const guardian = User.create({ name: 'Mum' }).id.value

    it('is set and kept by withProfile on a child, and dropped when the kind changes', () => {
      const child = User.create({ name: 'Leo', kind: 'child' }).withProfile({
        guardianId: guardian,
      })
      expect(child.guardianId).toBe(guardian)
      expect(child.withProfile({ name: 'Leon' }).guardianId).toBe(guardian)
      expect(child.withProfile({ kind: 'adult' }).guardianId).toBeNull()
    })

    it('cannot be the child themselves', () => {
      const child = User.create({ name: 'Leo', kind: 'child' })
      expect(() => child.withProfile({ guardianId: child.id.value })).toThrow(/guardian/)
    })
  })

  it('withProfile rejects an invalid name', () => {
    const u = User.create({ name: 'John' })
    expect(() => u.withProfile({ name: 'A' })).toThrow(/name/)
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

  describe('household', () => {
    const adult = () => User.create({ name: 'Ana' })

    it('is trimmed and stored on an adult', () => {
      expect(adult().withProfile({ household: '  García  ' }).household).toBe('García')
    })

    it('rejects a name over 50 characters', () => {
      expect(() => adult().withProfile({ household: 'x'.repeat(51) })).toThrow(/household/)
    })

    it('is left alone when the update does not mention it', () => {
      const grouped = adult().withProfile({ household: 'García' })
      expect(grouped.withProfile({ email: 'a@b.com' }).household).toBe('García')
    })
  })

  it('withProfile clears the optional text fields given null', () => {
    const user = User.create({ name: 'John', alias: 'cousin' }).withProfile({
      phone: '600',
      notes: 'n',
    })
    const cleared = user.withProfile({ alias: null, phone: null, notes: null })
    expect([cleared.alias, cleared.phone, cleared.notes]).toEqual([null, null, null])
  })
})
