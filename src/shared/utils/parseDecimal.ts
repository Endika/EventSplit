/**
 * Parse a user-typed number accepting BOTH ',' and '.' as the decimal mark,
 * so nobody has to care which separator their keyboard/locale produces.
 * Returns NaN for empty or non-numeric input (callers validate).
 */
export function parseDecimal(raw: string): number {
  const normalized = raw.trim().replace(/\s/g, '').replace(/,/g, '.')
  if (normalized === '') return NaN
  return Number(normalized)
}
