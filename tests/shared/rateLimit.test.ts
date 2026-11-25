import { describe, it, expect, beforeEach } from 'vitest'
import { allowWrite } from '@/shared/utils/rateLimit'

describe('allowWrite', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('allows up to 60 writes per minute and blocks the 61st', () => {
    const t0 = 1_000_000
    for (let i = 0; i < 60; i++) {
      expect(allowWrite(t0 + i)).toBe(true)
    }
    expect(allowWrite(t0 + 60)).toBe(false)
  })

  it('frees up budget once the window slides past a minute', () => {
    const t0 = 1_000_000
    for (let i = 0; i < 60; i++) allowWrite(t0 + i)
    expect(allowWrite(t0 + 100)).toBe(false)
    // 61s after the first write: the early ones fall out of the window
    expect(allowWrite(t0 + 61_000)).toBe(true)
  })

  it('drops writes exactly one minute old and keeps only the live window in storage', () => {
    const t0 = 1_000_000
    for (let i = 0; i < 60; i++) allowWrite(t0 + i)
    expect(allowWrite(t0 + 60_000)).toBe(true)
    const stored = JSON.parse(localStorage.getItem('eventsplit.writes') ?? '[]') as number[]
    expect(stored).toHaveLength(60)
    expect(stored[0]).toBe(t0 + 1)
    expect(stored.at(-1)).toBe(t0 + 60_000)
  })

  it('prunes expired writes from storage even when the call is refused', () => {
    const t0 = 1_000_000
    const live = Array.from({ length: 60 }, (_, i) => t0 + i)
    localStorage.setItem('eventsplit.writes', JSON.stringify([t0 - 60_000, ...live]))
    expect(allowWrite(t0 + 60)).toBe(false)
    expect(JSON.parse(localStorage.getItem('eventsplit.writes') ?? '[]')).toEqual(live)
  })

  it('starts a fresh budget when the stored history is corrupt', () => {
    localStorage.setItem('eventsplit.writes', '{not json')
    expect(allowWrite(1_000_000)).toBe(true)
    expect(JSON.parse(localStorage.getItem('eventsplit.writes') ?? '[]')).toEqual([1_000_000])
  })
})
