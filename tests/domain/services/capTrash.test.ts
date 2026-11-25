import { describe, it, expect } from 'vitest'
import { capTrash } from '@/domain/services/capTrash'
import { MAX_TRASH_ENTRIES } from '@/domain/entities/Event'

type Item = { id: string; deleted: boolean; deletedAt: string | null }

const live = (id: string): Item => ({ id, deleted: false, deletedAt: null })
const trashed = (id: string, deletedAt: string): Item => ({ id, deleted: true, deletedAt })

describe('capTrash', () => {
  it('returns the very same list when the deleted count is within the cap', () => {
    const items = [
      live('a'),
      ...Array.from({ length: MAX_TRASH_ENTRIES }, (_, i) =>
        trashed(`t${i}`, `2026-01-0${i + 1}T00:00:00.000Z`),
      ),
      live('b'),
    ]
    expect(capTrash(items)).toBe(items)
  })

  it('evicts the oldest deleted items whatever their order, treating a missing date as oldest', () => {
    const items = [
      trashed('t5', '2026-01-05T00:00:00.000Z'),
      trashed('t2', '2026-01-02T00:00:00.000Z'),
      trashed('undated', null as never),
      trashed('t7', '2026-01-07T00:00:00.000Z'),
      trashed('t1', '2026-01-01T00:00:00.000Z'),
      trashed('t6', '2026-01-06T00:00:00.000Z'),
      trashed('t4', '2026-01-04T00:00:00.000Z'),
      trashed('t3', '2026-01-03T00:00:00.000Z'),
    ]
    expect(capTrash(items).map((i) => i.id)).toEqual(['t5', 't7', 't6', 't4', 't3'])
  })
})
