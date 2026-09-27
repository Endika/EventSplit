import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Event } from '@/domain/entities/Event'
import { User } from '@/domain/entities/User'
import { WrongPinError } from '@/domain/repositories/IEventRepository'
import { SupabaseEventRepository } from '@/infrastructure/persistence/SupabaseEventRepository'

/** Answers every RPC with the given payload, the way PostgREST would. */
function answering(data: unknown): SupabaseClient {
  return { rpc: async () => ({ data, error: null }) } as unknown as SupabaseClient
}

const snapshot = () =>
  Event.create({ name: 'Trip', creator: User.create({ name: 'John' }) }).toSnapshot()

describe('SupabaseEventRepository wrong-PIN outcomes (returned, not raised)', () => {
  it('turns update_event returning 0 into WrongPinError', async () => {
    const s = snapshot()
    await expect(
      new SupabaseEventRepository(answering(0)).update(s.id, s, 3, '0000'),
    ).rejects.toBeInstanceOf(WrongPinError)
  })

  it('keeps a real version from update_event', async () => {
    const s = snapshot()
    const saved = await new SupabaseEventRepository(answering(4)).update(s.id, s, 3, '1234')
    expect(saved.version).toBe(4)
  })

  it('turns set_event_pin returning false into WrongPinError', async () => {
    await expect(
      new SupabaseEventRepository(answering(false)).setPin('abc1234', '5678', '0000'),
    ).rejects.toBeInstanceOf(WrongPinError)
  })

  it('turns delete_event returning false into WrongPinError', async () => {
    await expect(
      new SupabaseEventRepository(answering(false)).deleteEvent('abc1234', '0000'),
    ).rejects.toBeInstanceOf(WrongPinError)
  })

  it('accepts set_event_pin and delete_event returning true', async () => {
    const repo = new SupabaseEventRepository(answering(true))
    await expect(repo.setPin('abc1234', '5678', '1234')).resolves.toBeUndefined()
    await expect(repo.deleteEvent('abc1234', '1234')).resolves.toBeUndefined()
  })
})
