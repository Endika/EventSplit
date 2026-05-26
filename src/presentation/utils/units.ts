import { VALID_UNITS, SHARED_UNIT } from '@/domain/entities/Purchase'

/** Units offered in the purchase/expense dropdowns: real measures + the shared sentinel. */
export const SELECTABLE_UNITS = [...VALID_UNITS, SHARED_UNIT] as const

const KNOWN = new Set<string>(SELECTABLE_UNITS)

/** Translate a known unit key; fall back to the raw (free-text) unit otherwise. */
export function displayUnit(unit: string, t: (key: string) => string): string {
  return KNOWN.has(unit) ? t(`purchases.form.units.${unit}`) : unit
}
