export const isPositiveNumber = (n: number): boolean => Number.isFinite(n) && n > 0

export const round2 = (n: number): number => Math.round(n * 100) / 100

export const clampPercent = (n: number): number => {
  if (n > 100) return 100
  return n
}
