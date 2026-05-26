import { describe, it, expect } from 'vitest'
import { EditPin } from '@/domain/value-objects/EditPin'

describe('EditPin', () => {
  it('rejects non-numeric pins', async () => {
    await expect(EditPin.hash('abc1', 'event01')).rejects.toThrow(/digits/)
  })
  it('rejects pins outside 4-6 digit range', async () => {
    await expect(EditPin.hash('123', 'event01')).rejects.toThrow(/digits/)
    await expect(EditPin.hash('1234567', 'event01')).rejects.toThrow(/digits/)
  })
  it('produces deterministic hashes for the same pin+event', async () => {
    const h1 = await EditPin.hash('1234', 'event01')
    const h2 = await EditPin.hash('1234', 'event01')
    expect(h1).toBe(h2)
  })
  it('produces different hashes for the same pin under different events', async () => {
    const h1 = await EditPin.hash('1234', 'event01')
    const h2 = await EditPin.hash('1234', 'event02')
    expect(h1).not.toBe(h2)
  })
  it('verify returns true for correct pin', async () => {
    const h = await EditPin.hash('1234', 'event01')
    expect(await EditPin.verify('1234', h, 'event01')).toBe(true)
  })
  it('verify returns false for wrong pin or wrong event', async () => {
    const h = await EditPin.hash('1234', 'event01')
    expect(await EditPin.verify('9999', h, 'event01')).toBe(false)
    expect(await EditPin.verify('1234', h, 'event02')).toBe(false)
  })
  it('verify returns false (does not throw) on malformed input', async () => {
    const h = await EditPin.hash('1234', 'event01')
    expect(await EditPin.verify('abc', h, 'event01')).toBe(false)
  })
})
