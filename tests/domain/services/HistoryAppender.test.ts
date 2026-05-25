import { describe, it, expect } from 'vitest'
import { HistoryAppender } from '@/domain/services/HistoryAppender'
import { Event } from '@/domain/entities/Event'
import { User } from '@/domain/entities/User'

describe('HistoryAppender', () => {
  it('appends with incremented version and new timestamp', () => {
    const creator = User.create({ name: 'John' })
    const e = Event.create({ name: 'Trip', creator })
    const snap = e.toSnapshot()
    const next = HistoryAppender.append(snap, {
      type: 'expense_added', userId: creator.id.value,
      description: 'John added EUR 10', before: null, after: { cents: 1000 },
    })
    expect(next.history).toHaveLength(2)
    expect(next.history[1]!.version).toBe(2)
    expect(next.updatedAt >= snap.updatedAt).toBe(true)
  })
})
