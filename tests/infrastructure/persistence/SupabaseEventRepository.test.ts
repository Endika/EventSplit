import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Event } from '@/domain/entities/Event'
import { User } from '@/domain/entities/User'
import {
  isLockedEvent,
  RateLimitedError,
  WrongPinError,
} from '@/domain/repositories/IEventRepository'
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

/**
 * Resolves get_event the way PostgREST picks an overload: by argument names. The
 * two-argument get_event(p_id, p_pin) is the only one that answers; a call without
 * a p_pin key would reach the legacy overload, which this stub refuses. PIN "1234"
 * opens `blob`, "9999" is throttled, anything else (null included) is locked.
 */
function postgrest(blob: unknown): SupabaseClient {
  return {
    rpc: async (fn: string, args: Record<string, unknown>) => {
      if (fn !== 'get_event' || !('p_pin' in args)) {
        return { data: null, error: { code: 'PGRST202', message: 'legacy overload' } }
      }
      if (args.p_pin === '9999') return { data: null, error: { code: 'PT429' } }
      if (args.p_pin === '1234')
        return { data: { data: blob, version: 7, hasPin: true }, error: null }
      return { data: { locked: true, hasPin: true }, error: null }
    },
  } as unknown as SupabaseClient
}

describe('SupabaseEventRepository PIN-gated read (get_event overload)', () => {
  it('reaches the PIN-gated overload even with no PIN, and gets the locked marker', async () => {
    const s = snapshot()
    const read = await new SupabaseEventRepository(postgrest(s)).findById(s.id)
    expect(read).toEqual({ id: s.id, locked: true, hasPin: true })
  })

  it('reaches it with an explicit null PIN too', async () => {
    const s = snapshot()
    expect(
      isLockedEvent(await new SupabaseEventRepository(postgrest(s)).findById(s.id, null)),
    ).toBe(true)
  })

  it('returns the event with the right PIN', async () => {
    const s = snapshot()
    const read = await new SupabaseEventRepository(postgrest(s)).findById(s.id, '1234')
    if (isLockedEvent(read) || !read) throw new Error('expected the event')
    expect(read.snapshot.name).toBe('Trip')
    expect(read.version).toBe(7)
    expect(read.hasPin).toBe(true)
  })

  it('turns a throttled read (PT429) into RateLimitedError', async () => {
    const s = snapshot()
    await expect(
      new SupabaseEventRepository(postgrest(s)).findById(s.id, '9999'),
    ).rejects.toBeInstanceOf(RateLimitedError)
  })
})
