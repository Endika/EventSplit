import { MAX_TRASH_ENTRIES } from '@/domain/entities/Event'

type Trashable = { deleted: boolean; deletedAt: string | null }

/**
 * Hard-removes the oldest soft-deleted items once their count exceeds
 * MAX_TRASH_ENTRIES, keeping the most recently deleted ones (by `deletedAt`).
 * Live items are never touched and the original array order is preserved.
 */
export function capTrash<T extends Trashable>(items: T[]): T[] {
  const deleted = items.filter((i) => i.deleted)
  if (deleted.length <= MAX_TRASH_ENTRIES) return items

  const keep = new Set(
    [...deleted]
      .sort((a, b) => (a.deletedAt ?? '').localeCompare(b.deletedAt ?? ''))
      .slice(-MAX_TRASH_ENTRIES),
  )
  return items.filter((i) => !i.deleted || keep.has(i))
}
