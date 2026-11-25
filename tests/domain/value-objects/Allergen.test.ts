import { describe, it, expect } from 'vitest'
import { Allergen } from '@/domain/value-objects/Allergen'

describe('Allergen', () => {
  it('rejects an invalid severity', () => {
    expect(() => Allergen.of({ name: 'gluten', severity: 'maybe' as never })).toThrow(/severity/)
  })
  it('rejects notes longer than 200 chars', () => {
    expect(() => Allergen.of({ name: 'gluten', severity: 'mild', notes: 'a'.repeat(201) })).toThrow(
      /notes/,
    )
    expect(
      Allergen.of({ name: 'gluten', severity: 'mild', notes: 'a'.repeat(200) }).notes,
    ).toHaveLength(200)
  })
  it('round-trips through its snapshot', () => {
    const snapshot = { name: 'fish', severity: 'moderate', notes: 'cod' } as const
    expect(Allergen.restore(snapshot).toSnapshot()).toEqual(snapshot)
  })
  it('normalizes empty notes to null', () => {
    expect(Allergen.of({ name: 'lactose', severity: 'mild', notes: '   ' }).notes).toBeNull()
    expect(Allergen.of({ name: 'lactose', severity: 'mild' }).notes).toBeNull()
  })
})
