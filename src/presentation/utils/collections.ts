export function toggleInSet<T>(set: ReadonlySet<T>, value: T): Set<T> {
  const next = new Set(set)
  if (!next.delete(value)) next.add(value)
  return next
}

/** The list with `item` swapped one step towards `dir`, or null when it cannot move. */
export function swapWithNeighbour<T>(list: readonly T[], item: T, dir: -1 | 1): T[] | null {
  const idx = list.indexOf(item)
  const target = idx + dir
  if (idx < 0 || target < 0 || target >= list.length) return null
  const next = [...list]
  ;[next[idx], next[target]] = [next[target]!, next[idx]!]
  return next
}

export const live = <T extends { deleted: boolean }>(items: readonly T[]): T[] =>
  items.filter((i) => !i.deleted)

export const trashed = <T extends { deleted: boolean }>(items: readonly T[]): T[] =>
  items.filter((i) => i.deleted)

/** The items at `indexes`, in that order; an index outside the list yields nothing. */
export const pickAt = <T>(list: readonly T[], indexes: readonly number[]): T[] =>
  indexes.flatMap((i) => {
    const item = list[i]
    return item === undefined ? [] : [item]
  })
