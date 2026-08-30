import { type DayOption, optionsCoveringDay } from '@/domain/value-objects/DayOption'

/** Warm steps above zero. Level 0 means nobody, level 4 means everybody. */
export const HEAT_LEVELS = 4

/**
 * A single vote is already level 1: an option someone picked must never be
 * painted as empty. The three steps above it split the rest by proportion.
 */
export function heatLevel(votes: number, total: number): 0 | 1 | 2 | 3 | 4 {
  if (votes <= 0 || total <= 0) return 0
  if (votes >= total) return 4
  const ratio = votes / total
  if (ratio < 0.34) return 1
  if (ratio < 0.67) return 2
  return 3
}

/** How many of `userIds` voted each option, positionally aligned with `options`. */
export function votesPerOption(
  options: DayOption[],
  votes: Record<string, boolean[]>,
  userIds: string[],
): number[] {
  return options.map((_, i) => userIds.reduce((n, id) => n + (votes[id]?.[i] ? 1 : 0), 0))
}

/**
 * The heat a calendar day should show. Options may overlap, so a day can belong
 * to several: the best option passing through it wins, which is what a reader
 * cares about ("is this day part of a good plan?").
 *
 * Returns null for a day no option covers.
 */
export function dayHeat(
  options: DayOption[],
  counts: number[],
  iso: string,
  totalVoters = 0,
): { level: 0 | 1 | 2 | 3 | 4; votes: number; optionIndexes: number[] } | null {
  const optionIndexes = optionsCoveringDay(options, iso)
  if (optionIndexes.length === 0) return null
  const votes = Math.max(...optionIndexes.map((i) => counts[i] ?? 0))
  return { level: heatLevel(votes, totalVoters), votes, optionIndexes }
}
