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
})
