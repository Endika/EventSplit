import { type DayOption, optionKey } from '@/domain/value-objects/DayOption'

/**
 * Which options earn a column in the availability table: every chosen one, plus
 * the `limit` most voted of the rest. With up to 31 options a column each is
 * unreadable on a phone, so the calendar is the full map and the table is the
 * detail of the options that matter.
 *
 * Returns indexes into `options`, in that array's own (chronological) order.
 * Ties on votes go to the earlier option, since `options` is already sorted.
 */
export function pickTableOptions(
  options: DayOption[],
  counts: number[],
  chosen: string[],
  limit = 7,
): number[] {
  const chosenKeys = new Set(chosen)
  const isChosen = (i: number): boolean => {
    const o = options[i]
    return o !== undefined && chosenKeys.has(optionKey(o))
  }

  const all = options.map((_, i) => i)
  const topOfTheRest = all
    .filter((i) => !isChosen(i))
    .sort((a, b) => (counts[b] ?? 0) - (counts[a] ?? 0) || a - b)
    .slice(0, limit)

  return [...new Set([...all.filter(isChosen), ...topOfTheRest])].sort((a, b) => a - b)
}
