import { describe, it, expect } from 'vitest'
import {
  affectsField,
  conceptField,
  eventNameField,
  itemNameField,
  optionalTextField,
  personNameField,
  renamedToField,
  unitField,
} from '@/application/dtos/fields'
import { CONCEPT_MAX, CONCEPT_MIN } from '@/domain/entities/ManualLiquidation'
import { EVENT_NAME_MAX, EVENT_NAME_MIN } from '@/domain/entities/Event'
import { ITEM_NAME_MAX, ITEM_NAME_MIN, UNIT_MAX, UNIT_MIN } from '@/domain/entities/Purchase'
import { PERSON_NAME_MAX, PERSON_NAME_MIN } from '@/domain/entities/User'

describe('shared DTO text fields', () => {
  it.each([
    ['itemNameField', itemNameField, ITEM_NAME_MIN, ITEM_NAME_MAX],
    ['personNameField', personNameField, PERSON_NAME_MIN, PERSON_NAME_MAX],
    ['eventNameField', eventNameField, EVENT_NAME_MIN, EVENT_NAME_MAX],
    ['conceptField', conceptField, CONCEPT_MIN, CONCEPT_MAX],
    ['unitField', unitField, UNIT_MIN, UNIT_MAX],
    ['renamedToField', renamedToField, 0, 50],
    ['optionalTextField', optionalTextField(40), 0, 40],
  ] as const)('%s trims and enforces its length bounds', (_name, field, min, max) => {
    expect(field.parse(`  ${'x'.repeat(Math.max(min, 1))}  `)).toBe('x'.repeat(Math.max(min, 1)))
    expect(field.safeParse('x'.repeat(max)).success).toBe(true)
    expect(field.safeParse('x'.repeat(max + 1)).success).toBe(false)
    expect(field.safeParse(' '.repeat(max + 1) + 'x'.repeat(max)).success).toBe(true)
    if (min > 0) expect(field.safeParse('x'.repeat(min - 1)).success).toBe(false)
    if (min > 0) expect(field.safeParse(' '.repeat(min) + 'x'.repeat(min - 1)).success).toBe(false)
  })

  it('affectsField defaults to an empty list', () => {
    expect(affectsField.parse(undefined)).toEqual([])
  })
})
