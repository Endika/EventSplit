export type TriState = 'on' | 'off' | 'mixed'

/** What a parent checkbox shows given its children. No children reads as off. */
export function parentState(childrenOn: boolean[]): TriState {
  if (childrenOn.length === 0) return 'off'
  if (childrenOn.every(Boolean)) return 'on'
  if (childrenOn.some(Boolean)) return 'mixed'
  return 'off'
}

/** Add or remove a whole group of ids from a selection, leaving the rest alone. */
export function toggleGroup(ids: string[], selected: string[], on: boolean): string[] {
  if (on) return [...new Set([...selected, ...ids])]
  const dropped = new Set(ids)
  return selected.filter((id) => !dropped.has(id))
}

/** Flip one id in a selection. */
export function toggleOne(id: string, selected: string[]): string[] {
  return selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]
}
