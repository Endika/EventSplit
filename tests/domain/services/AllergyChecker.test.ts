import { describe, it, expect } from 'vitest'
import { AllergyChecker } from '@/domain/services/AllergyChecker'
import type { AllergenSnapshot } from '@/domain/value-objects/Allergen'

const gluten: AllergenSnapshot = { name: 'gluten', severity: 'severe', notes: null }
const lactose: AllergenSnapshot = { name: 'lactose', severity: 'mild', notes: null }

const profile = (id: string, name: string, allergies: AllergenSnapshot[]) => ({
  userId: id,
  displayName: name,
  allergies,
})

describe('AllergyChecker', () => {
  it.each([
    ['gluten', 'gluten'],
    ['lactose', 'milk'],
    ['egg', 'huevo'],
    ['peanut', 'cacahuete'],
    ['nuts', 'almendra'],
    ['shellfish', 'gamba'],
    ['fish', 'salmón'],
    ['soy', 'tofu'],
    ['mustard', 'mostaza'],
    ['celery', 'apio'],
    ['sesame', 'sésamo'],
    ['sulfites', 'vino'],
    ['mollusks', 'pulpo'],
  ] as const)('flags %s for the keyword "%s"', (name, keyword) => {
    const allergy: AllergenSnapshot = { name, severity: 'severe', notes: null }
    expect(
      AllergyChecker.findMatches({
        item: `Plato de ${keyword}`,
        users: [profile('a', 'John', [allergy])],
      }),
    ).toEqual([{ userId: 'a', displayName: 'John', allergen: name, severity: 'severe', keyword }])
  })

  it('matches an "other" note regardless of padding and punctuation inside it', () => {
    const other: AllergenSnapshot = { name: 'other', severity: 'mild', notes: ' a.b+ ' }
    const match = (item: string) =>
      AllergyChecker.findMatches({ item, users: [profile('a', 'Eva', [other])] })
    expect(match('mezcla a.b+ casera')).toHaveLength(1)
    expect(match('mezcla axb casera')).toEqual([])
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
