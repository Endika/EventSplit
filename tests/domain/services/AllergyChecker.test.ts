import { describe, it, expect } from 'vitest'
import { AllergyChecker } from '@/domain/services/AllergyChecker'
import type { AllergenSnapshot } from '@/domain/value-objects/Allergen'

const gluten: AllergenSnapshot = { name: 'gluten', severity: 'severe', notes: null }
const lactose: AllergenSnapshot = { name: 'lactose', severity: 'mild', notes: null }
const peanut: AllergenSnapshot = { name: 'peanut', severity: 'moderate', notes: null }

const profile = (id: string, name: string, allergies: AllergenSnapshot[]) => ({
  userId: id,
  displayName: name,
  allergies,
})

describe('AllergyChecker', () => {
  it('returns empty when nobody has allergies', () => {
    const result = AllergyChecker.findMatches({
      item: 'Pan integral',
      users: [profile('a', 'John', [])],
    })
    expect(result).toEqual([])
  })

  it('matches the allergen own name "gluten" in the item', () => {
    const result = AllergyChecker.findMatches({
      item: 'Tarta de gluten',
      users: [profile('a', 'John', [gluten])],
    })
    expect(result).toHaveLength(1)
    expect(result[0]?.keyword).toBe('gluten')
  })

  it('matches an "other" allergen by its free-text note', () => {
    const other: AllergenSnapshot = { name: 'other', severity: 'severe', notes: 'mango' }
    const result = AllergyChecker.findMatches({
      item: 'Zumo de mango',
      users: [profile('a', 'Eva', [other])],
    })
    expect(result).toHaveLength(1)
    expect(result[0]?.allergen).toBe('other')
  })

  it('ignores an "other" allergen with no note', () => {
    const other: AllergenSnapshot = { name: 'other', severity: 'mild', notes: null }
    const result = AllergyChecker.findMatches({
      item: 'Mango',
      users: [profile('a', 'Eva', [other])],
    })
    expect(result).toEqual([])
  })

  it('detects spanish keyword "pan" → gluten', () => {
    const result = AllergyChecker.findMatches({
      item: 'Pan integral',
      users: [profile('a', 'John', [gluten])],
    })
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      userId: 'a',
      displayName: 'John',
      allergen: 'gluten',
      severity: 'severe',
      keyword: 'pan',
    })
  })

  it('detects english keyword "milk" → lactose', () => {
    const result = AllergyChecker.findMatches({
      item: 'Whole milk',
      users: [profile('a', 'Maria', [lactose])],
    })
    expect(result.map((m) => m.allergen)).toEqual(['lactose'])
  })

  it('does not match partial words ("pant" should not match "pan")', () => {
    const result = AllergyChecker.findMatches({
      item: 'Pantalones',
      users: [profile('a', 'John', [gluten])],
    })
    expect(result).toEqual([])
  })

  it('is case-insensitive', () => {
    const result = AllergyChecker.findMatches({
      item: 'PEANUT butter',
      users: [profile('a', 'Ana', [peanut])],
    })
    expect(result).toHaveLength(1)
  })

  it('returns one entry per affected user, not per keyword match', () => {
    const result = AllergyChecker.findMatches({
      item: 'Pan con queso', // matches both gluten ("pan") AND lactose ("queso")
      users: [profile('a', 'John', [gluten, lactose])],
    })
    // For the same user, multiple allergens can match — return one entry per (user, allergen) pair
    expect(result).toHaveLength(2)
    expect(new Set(result.map((m) => m.allergen))).toEqual(new Set(['gluten', 'lactose']))
  })
})
