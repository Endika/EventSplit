import { VALID_UNITS, SHARED_UNIT } from '@/domain/entities/Purchase'

/** Units offered in the purchase/expense dropdowns: real measures + the shared sentinel. */
export const SELECTABLE_UNITS = [...VALID_UNITS, SHARED_UNIT] as const

const KNOWN = new Set<string>(SELECTABLE_UNITS)

type T = (key: string, opts?: Record<string, unknown>) => string

/**
 * Translate a known unit key, picking singular/plural based on `count` via i18next's
 * built-in plural support (_one / _other suffixes). Falls back to the raw (free-text)
 * unit otherwise. When `count` is omitted, returns the base plural form (used for
 * dropdown labels).
 */
export function displayUnit(unit: string, t: T, count?: number): string {
  if (!KNOWN.has(unit)) return unit
  const key = `purchases.form.units.${unit}`
  return count === undefined ? t(key) : t(key, { count })
}
