import { describe, it, expect } from 'vitest'
import {
  addAllergy,
  allergenOptions,
  existingHouseholds,
  guardianCandidates,
  hasValidName,
  needsAlias,
  profileFields,
  type ProfileForm,
} from '@/presentation/utils/participants'
import type { AllergenSnapshot } from '@/domain/value-objects/Allergen'
import { makeUser } from '../../support/eventFixtures'

describe('hasValidName', () => {
  it.each([
    [' a ', false],
    ['ab', true],
  ])('%j -> %s', (name, ok) => {
    expect(hasValidName(name)).toBe(ok)
  })
})

describe('needsAlias', () => {
  const users = [{ name: 'Ane' }, { name: ' Bea ' }]
  it.each([
    ['  ane ', '  ', true],
    ['bea', '', true],
    ['Iker', '', false],
  ])('%j with alias %j -> %s', (name, alias, expected) => {
    expect(needsAlias(users, name, alias)).toBe(expected)
  })
})

describe('guardianCandidates', () => {
  const users = [
    makeUser('a'),
    makeUser('b', { kind: 'child' }),
    makeUser('c', { kind: 'dog' }),
    makeUser('d'),
  ]
  it('keeps adults only and can leave one out', () => {
    expect(guardianCandidates(users).map((u) => u.id)).toEqual(['a', 'd'])
    expect(guardianCandidates(users, 'a').map((u) => u.id)).toEqual(['d'])
  })
})

describe('existingHouseholds', () => {
  it('lists each household once, sorted, skipping people without one', () => {
    const users = [
      { household: 'Zubi' },
      { household: null },
      { household: 'Etxe' },
      { household: 'Zubi' },
      { household: '' },
    ]
    expect(existingHouseholds(users)).toEqual(['Etxe', 'Zubi'])
  })
})

describe('form fields', () => {
  const form: ProfileForm = {
    name: ' Ane ',
    alias: ' Anita ',
    kind: 'adult',
    guardianId: 'g1',
    email: ' a@b.c ',
    phone: ' 600 ',
    dietary: ' veg ',
    notes: ' hi ',
    household: ' Etxe ',
    allergies: [],
  }

  it('trims what is typed and turns blanks into null', () => {
    expect(profileFields(form)).toStrictEqual({
      name: 'Ane',
      alias: 'Anita',
      kind: 'adult',
      guardianId: null,
      email: 'a@b.c',
      phone: '600',
      dietary: 'veg',
      notes: 'hi',
      household: 'Etxe',
      allergies: [],
    })
    const blank = {
      ...form,
      alias: ' ',
      email: '',
      phone: ' ',
      dietary: '',
      notes: '',
      household: ' ',
    }
    expect(profileFields(blank)).toMatchObject({
      alias: null,
      email: null,
      phone: null,
      dietary: null,
      notes: null,
      household: null,
    })
  })

  it('keeps the guardian of a child', () => {
    expect(profileFields({ ...form, kind: 'child', guardianId: 'g1' })).toMatchObject({
      guardianId: 'g1',
      household: null,
    })
  })
})

describe('addAllergy', () => {
  const gluten: AllergenSnapshot = { name: 'gluten', severity: 'mild', notes: null }
  const entry = { name: 'gluten', severity: 'severe', notes: ' bread ' } as const

  it('appends the entry with trimmed notes and leaves the list alone', () => {
    const list = [gluten]
    expect(addAllergy(list, { ...entry, name: 'egg', notes: ' ' })).toStrictEqual([
      gluten,
      { name: 'egg', severity: 'severe', notes: null },
    ])
    expect(addAllergy([], entry)).toStrictEqual([
      { name: 'gluten', severity: 'severe', notes: 'bread' },
    ])
    expect(list).toStrictEqual([gluten])
  })

  it('refuses a repeat, except for "other"', () => {
    expect(addAllergy([gluten], entry)).toBeNull()
    const other: AllergenSnapshot = { name: 'other', severity: 'mild', notes: 'kiwi' }
    expect(addAllergy([other], { ...entry, name: 'other' })).toHaveLength(2)
  })
})

describe('allergenOptions', () => {
  it('sorts by label and puts other last', () => {
    const labels: Record<string, string> = { gluten: 'Z', other: 'A', egg: 'Y' }
    const opts = allergenOptions((n) => labels[n] ?? n)
    expect(opts.at(-1)).toBe('other')
    expect(opts.filter((n) => n === 'other')).toHaveLength(1)
    expect(opts.indexOf('egg')).toBeLessThan(opts.indexOf('gluten'))
    const plain = allergenOptions((n) => n)
    expect(plain.slice(0, -1)).toEqual([...plain.slice(0, -1)].sort())
  })
})
