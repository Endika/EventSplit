export const COMMON_ALLERGENS = [
  'gluten', 'lactose', 'egg', 'peanut', 'nuts', 'shellfish', 'fish',
  'soy', 'mustard', 'celery', 'sesame', 'sulfites', 'mollusks', 'other',
] as const

export type AllergenName = (typeof COMMON_ALLERGENS)[number]

export type AllergenSeverity = 'mild' | 'moderate' | 'severe'

const VALID_SEVERITIES: AllergenSeverity[] = ['mild', 'moderate', 'severe']

export interface AllergenSnapshot {
  name: AllergenName
  severity: AllergenSeverity
  notes: string | null
}

export class Allergen {
  private constructor(
    readonly name: AllergenName,
    readonly severity: AllergenSeverity,
    readonly notes: string | null,
  ) {}

  static of(input: { name: string; severity: string; notes?: string | null }): Allergen {
    if (!(COMMON_ALLERGENS as readonly string[]).includes(input.name))
      throw new Error(`Allergen: unknown name "${input.name}"`)
    if (!VALID_SEVERITIES.includes(input.severity as AllergenSeverity))
      throw new Error(`Allergen: invalid severity "${input.severity}"`)
    const trimmed = input.notes?.trim() ?? ''
    if (trimmed.length > 200) throw new Error('Allergen: notes must be ≤ 200 chars')
    const notes = trimmed === '' ? null : trimmed
    return new Allergen(input.name as AllergenName, input.severity as AllergenSeverity, notes)
  }

  static restore(s: AllergenSnapshot): Allergen {
    return new Allergen(s.name, s.severity, s.notes)
  }

  toSnapshot(): AllergenSnapshot {
    return { name: this.name, severity: this.severity, notes: this.notes }
  }
}
