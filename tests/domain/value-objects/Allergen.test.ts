import { describe, it, expect } from 'vitest'
import { Allergen, COMMON_ALLERGENS } from '@/domain/value-objects/Allergen'

describe('Allergen', () => {
  it('rejects an unknown name', () => {
    expect(() => Allergen.of({ name: 'unicorn', severity: 'mild' })).toThrow(/name/)
  })
  it('rejects an invalid severity', () => {
    expect(() => Allergen.of({ name: 'gluten', severity: 'maybe' as never })).toThrow(/severity/)
  })
  it('rejects notes longer than 200 chars', () => {
    expect(() => Allergen.of({ name: 'gluten', severity: 'mild', notes: 'a'.repeat(201) })).toThrow(
      /notes/,
    )
  })
  it('accepts valid construction with all severities', () => {
    const a = Allergen.of({ name: 'gluten', severity: 'severe', notes: '  trimmed  ' })
    expect(a.name).toBe('gluten')
    expect(a.severity).toBe('severe')
    expect(a.notes).toBe('trimmed')
  })
  it('normalizes empty notes to null', () => {
    expect(Allergen.of({ name: 'lactose', severity: 'mild', notes: '   ' }).notes).toBeNull()
    expect(Allergen.of({ name: 'lactose', severity: 'mild' }).notes).toBeNull()
  })
  it('exposes COMMON_ALLERGENS as the canonical list of 14 names', () => {
    expect(COMMON_ALLERGENS).toHaveLength(14)
    expect(COMMON_ALLERGENS).toContain('gluten')
    expect(COMMON_ALLERGENS).toContain('other')
  })
})
