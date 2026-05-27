import { describe, it, expect } from 'vitest'
import { capTrash } from '@/domain/services/capTrash'
import { MAX_TRASH_ENTRIES } from '@/domain/entities/Event'

type Item = { id: string; deleted: boolean; deletedAt: string | null }

const live = (id: string): Item => ({ id, deleted: false, deletedAt: null })
const trashed = (id: string, deletedAt: string): Item => ({ id, deleted: true, deletedAt })

describe('capTrash', () => {
  it('returns the list untouched when deleted count is within the cap', () => {
    const items = [live('a'), trashed('t1', '2026-01-01T00:00:00.000Z'), live('b')]
    expect(capTrash(items)).toEqual(items)
  })

  it('evicts the oldest deleted items beyond the cap, keeping the most recent', () => {
    const items = Array.from({ length: 8 }, (_, i) =>
      trashed(`t${i}`, `2026-01-0${i + 1}T00:00:00.000Z`),
    )
    const result = capTrash(items)
    expect(result).toHaveLength(MAX_TRASH_ENTRIES)
    expect(result.map((i) => i.id)).toEqual(['t3', 't4', 't5', 't6', 't7'])
  })

  it('keeps every live item and preserves original order when evicting', () => {
    const items = [
      trashed('oldest', '2026-01-01T00:00:00.000Z'),
      live('a'),
      trashed('t2', '2026-01-02T00:00:00.000Z'),
      trashed('t3', '2026-01-03T00:00:00.000Z'),
      live('b'),
      trashed('t4', '2026-01-04T00:00:00.000Z'),
      trashed('t5', '2026-01-05T00:00:00.000Z'),
      trashed('t6', '2026-01-06T00:00:00.000Z'),
    ]
    // 6 deleted, cap 5 → only 'oldest' is evicted, live items stay in place
    const result = capTrash(items)
    expect(result.map((i) => i.id)).toEqual(['a', 't2', 't3', 'b', 't4', 't5', 't6'])
  })
})
