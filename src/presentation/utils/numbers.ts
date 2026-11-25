export const isPositiveNumber = (n: number): boolean => Number.isFinite(n) && n > 0

export const round2 = (n: number): number => Math.round(n * 100) / 100

/** An amount as a text field shows it: 12.5 for 1250 cents. */
export const centsToInput = (cents: number): string => (cents / 100).toString()
