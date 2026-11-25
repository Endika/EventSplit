import { describe, it, expect, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Event } from '@/domain/entities/Event'
import { User } from '@/domain/entities/User'
import {
  isLockedEvent,
  PayloadTooLargeError,
  RateLimitedError,
  StaleClientError,
  VersionConflictError,
  WrongPinError,
} from '@/domain/repositories/IEventRepository'
import { SupabaseEventRepository } from '@/infrastructure/persistence/SupabaseEventRepository'
import { SCHEMA_VERSION } from '@/infrastructure/persistence/schemaVersion'

type Reply = { data?: unknown; error?: { code?: string; message?: string } | null }

/** Answers each RPC by name, the way PostgREST would, and records the calls. */
function rpcStub(replies: Record<string, Reply> = {}) {
  const rpc = vi.fn(async (fn: string, _args: Record<string, unknown>) => {
    const reply = replies[fn] ?? {}
    return { data: reply.data ?? null, error: reply.error ?? null }
  })
  return { rpc, repo: new SupabaseEventRepository({ rpc } as unknown as SupabaseClient) }
}

const snapshot = () =>
  Event.create({ name: 'Trip', creator: User.create({ name: 'John' }) }).toSnapshot()

describe('SupabaseEventRepository wrong-PIN outcomes (returned, not raised)', () => {
  it('reads the PIN outcome of update_event, set_event_pin, delete_event and verify_event_pin from the returned value', async () => {
    const s = snapshot()

    await expect(
      rpcStub({ update_event: { data: 0 } }).repo.update(s.id, s, 3, '0000'),
    ).rejects.toBeInstanceOf(WrongPinError)
    await expect(
      rpcStub({ set_event_pin: { data: false } }).repo.setPin(s.id, '5678', '0000'),
    ).rejects.toBeInstanceOf(WrongPinError)
    await expect(
      rpcStub({ delete_event: { data: false } }).repo.deleteEvent(s.id, '0000'),
    ).rejects.toBeInstanceOf(WrongPinError)

    const { repo } = rpcStub({
      set_event_pin: { data: true },
      delete_event: { data: true },
      verify_event_pin: { data: true },
    })
    await expect(repo.setPin('abc1234', '5678', '1234')).resolves.toBeUndefined()
    await expect(repo.deleteEvent('abc1234', '1234')).resolves.toBeUndefined()
    expect(await repo.verifyPin('abc1234', '1234')).toBe(true)

    expect(await rpcStub({ verify_event_pin: { data: false } }).repo.verifyPin('a', '0')).toBe(
      false,
    )
    expect(await rpcStub({ verify_event_pin: { data: null } }).repo.verifyPin('a', '0')).toBe(false)
  })
})

describe('SupabaseEventRepository RPC contract', () => {
  it('sends exactly these arguments to each RPC', async () => {
    const s = { ...snapshot(), hasPin: true }
    const { rpc, repo } = rpcStub({
      create_event: { data: 1 },
      update_event: { data: 4 },
      set_event_pin: { data: true },
      verify_event_pin: { data: true },
      delete_event: { data: true },
      get_event_version: { data: 4 },
    })
    const { hasPin: _hasPin, ...rest } = s
    void _hasPin
    const blob = { ...rest, _schemaVersion: SCHEMA_VERSION }

    await repo.getVersion(s.id)
    await repo.create(s)
    await repo.update(s.id, s, 3, '1234')
    await repo.setPin(s.id, '5678', '1234')
    await repo.verifyPin(s.id, '1234')
    await repo.deleteEvent(s.id, '1234')

    expect(rpc.mock.calls).toEqual([
      ['get_event_version', { p_id: s.id }],
      ['create_event', { p_id: s.id, p_data: blob, p_name: s.name, p_created_by: s.createdBy }],
      [
        'update_event',
        { p_id: s.id, p_data: blob, p_name: s.name, p_expected_version: 3, p_pin: '1234' },
      ],
      ['set_event_pin', { p_id: s.id, p_new_pin: '5678', p_current_pin: '1234' }],
      ['verify_event_pin', { p_id: s.id, p_pin: '1234' }],
      ['delete_event', { p_id: s.id, p_pin: '1234' }],
    ])
  })

  it('returns the server version, and falls back when the server sends none', async () => {
    const s = snapshot()

    expect(await rpcStub({ get_event_version: { data: 7 } }).repo.getVersion(s.id)).toBe(7)
    expect(await rpcStub().repo.getVersion(s.id)).toBeNull()
    expect((await rpcStub({ create_event: { data: 5 } }).repo.create(s)).version).toBe(5)
    expect(await rpcStub().repo.create(s)).toEqual({ snapshot: s, version: 1 })
    expect(await rpcStub({ update_event: { data: 9 } }).repo.update(s.id, s, 3, null)).toEqual({
      snapshot: s,
      version: 9,
    })
    expect((await rpcStub().repo.update(s.id, s, 3, null)).version).toBe(4)
  })

  it.each([
    ['PT401', WrongPinError],
    ['PT413', PayloadTooLargeError],
    ['PT429', RateLimitedError],
    ['PT426', StaleClientError],
  ])('maps SQLSTATE %s to its domain error on every RPC', async (code, expected) => {
    const s = snapshot()
    const error = { code }
    const stub = (fn: string) => rpcStub({ [fn]: { error } }).repo

    for (const call of [
      () => stub('get_event').findById(s.id),
      () => stub('create_event').create(s),
      () => stub('update_event').update(s.id, s, 1, null),
      () => stub('set_event_pin').setPin(s.id, '1234', null),
      () => stub('verify_event_pin').verifyPin(s.id, '1234'),
      () => stub('delete_event').deleteEvent(s.id, null),
    ]) {
      await expect(call()).rejects.toBeInstanceOf(expected)
    }
  })

  it('rethrows an unknown RPC error as it came, and a failed version probe too', async () => {
    const s = snapshot()
    const error = { code: 'XX000', message: 'boom' }

    await expect(rpcStub({ get_event: { error } }).repo.findById(s.id)).rejects.toBe(error)
    await expect(rpcStub({ create_event: { error } }).repo.create(s)).rejects.toBe(error)
    await expect(rpcStub({ update_event: { error } }).repo.update(s.id, s, 1, null)).rejects.toBe(
      error,
    )
    await expect(rpcStub({ get_event_version: { error } }).repo.getVersion(s.id)).rejects.toBe(
      error,
    )
  })

  it('turns an optimistic-lock loss (PT409) into a VersionConflictError carrying the probed version', async () => {
    const s = snapshot()
    const lost = { code: 'PT409' }

    const { rpc, repo } = rpcStub({ update_event: { error: lost }, get_event_version: { data: 6 } })
    await expect(repo.update(s.id, s, 3, null)).rejects.toMatchObject({
      constructor: VersionConflictError,
      currentVersion: 6,
    })
    expect(rpc).toHaveBeenLastCalledWith('get_event_version', { p_id: s.id })

    await expect(
      rpcStub({ update_event: { error: lost } }).repo.update(s.id, s, 3, null),
    ).rejects.toMatchObject({
      currentVersion: -1,
    })
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
  it('reaches the PIN-gated overload with no PIN or a null one, and gets the locked marker', async () => {
    const s = snapshot()
    const repo = new SupabaseEventRepository(postgrest(s))

    expect(await repo.findById(s.id)).toEqual({ id: s.id, locked: true, hasPin: true })
    expect(isLockedEvent(await repo.findById(s.id, null))).toBe(true)
    expect(await rpcStub().repo.findById('missing')).toBeNull()
  })

  it('returns the event with the right PIN, flagged as PIN-protected', async () => {
    const s = snapshot()
    const read = await new SupabaseEventRepository(postgrest(s)).findById(s.id, '1234')

    expect(read).toEqual({ snapshot: { ...s, hasPin: true }, version: 7, hasPin: true })
  })

  it('turns a throttled read (PT429) into RateLimitedError', async () => {
    const s = snapshot()
    await expect(
      new SupabaseEventRepository(postgrest(s)).findById(s.id, '9999'),
    ).rejects.toBeInstanceOf(RateLimitedError)
  })
})
