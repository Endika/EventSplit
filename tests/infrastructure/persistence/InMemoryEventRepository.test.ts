import { describe, it, expect } from 'vitest'
import { InMemoryEventRepository } from '@/infrastructure/persistence/InMemoryEventRepository'
import { Event, type EventSnapshot } from '@/domain/entities/Event'
import { User } from '@/domain/entities/User'
import {
  PayloadTooLargeError,
  RateLimitedError,
  VersionConflictError,
  WrongPinError,
  isLockedEvent,
} from '@/domain/repositories/IEventRepository'
import { readEvent } from '../../support/readEvent'

const makeSnapshot = () =>
  Event.create({ name: 'Trip', creator: User.create({ name: 'John' }) }).toSnapshot()

const MAX_EVENT_BYTES = 524288

function paddedTo(snapshot: EventSnapshot, bytes: number): EventSnapshot {
  const slack = bytes - JSON.stringify(snapshot).length
  return { ...snapshot, name: 'x'.repeat(snapshot.name.length + slack) }
}

async function pinned(pin = '1234') {
  const repo = new InMemoryEventRepository()
  const snapshot = makeSnapshot()
  await repo.create(snapshot)
  await repo.setPin(snapshot.id, pin, null)
  return { repo, snapshot, id: snapshot.id }
}

async function guess(repo: InMemoryEventRepository, id: string, times: number) {
  for (let i = 0; i < times; i++) await repo.verifyPin(id, '0000')
}

describe('InMemoryEventRepository', () => {
  it('round-trips create, read and update, counting full-snapshot reads', async () => {
    const repo = new InMemoryEventRepository()
    const snapshot = makeSnapshot()

    expect(await repo.findById('missing')).toBeNull()
    expect(await repo.getVersion('missing')).toBeNull()
    expect(await repo.create(snapshot)).toEqual({ snapshot, version: 1 })
    expect(await repo.getVersion(snapshot.id)).toBe(1)
    expect(await repo.findById(snapshot.id)).toEqual({ snapshot, version: 1, hasPin: false })

    const next = { ...snapshot, name: 'Renamed' }
    expect(await repo.update(snapshot.id, next, 1, null)).toEqual({ snapshot: next, version: 2 })
    expect((await readEvent(repo, snapshot.id))?.snapshot.name).toBe('Renamed')
    expect(repo.findByIdCalls).toBe(3)
  })

  it('rejects a duplicate create, a stale expected version and writes on a missing event', async () => {
    const repo = new InMemoryEventRepository()
    const snapshot = makeSnapshot()
    await repo.create(snapshot)

    await expect(repo.create(snapshot)).rejects.toThrow(/exists/)
    await expect(repo.update(snapshot.id, snapshot, 99, null)).rejects.toMatchObject({
      constructor: VersionConflictError,
      currentVersion: 1,
    })

    const empty = new InMemoryEventRepository()

    await expect(empty.update(snapshot.id, snapshot, 1, null)).rejects.toThrow('Event not found')
    await expect(empty.setPin(snapshot.id, '1234', null)).rejects.toThrow('Event not found')
    await expect(empty.deleteEvent(snapshot.id, null)).rejects.toThrow('Event not found')
    expect(await empty.verifyPin(snapshot.id, '1234')).toBe(false)
  })

  it.each([
    ['create', (repo: InMemoryEventRepository, s: EventSnapshot) => repo.create(s)],
    [
      'update',
      async (repo: InMemoryEventRepository, s: EventSnapshot) => {
        await repo.create(makeSnapshotWithId(s.id))
        return repo.update(s.id, s, 1, null)
      },
    ],
  ])('%s accepts a blob of exactly the byte cap and rejects one byte more', async (_op, write) => {
    const base = makeSnapshot()
    const repo = new InMemoryEventRepository()

    await expect(write(repo, paddedTo(base, MAX_EVENT_BYTES))).resolves.toBeDefined()
    await expect(
      write(new InMemoryEventRepository(), paddedTo(base, MAX_EVENT_BYTES + 1)),
    ).rejects.toBeInstanceOf(PayloadTooLargeError)
  })

  it.each([
    ['too short', '123'],
    ['too long', '1234567'],
    ['letters before', 'a1234'],
    ['letters after', '1234a'],
  ])('refuses a PIN that is %s and accepts 4 to 6 digits', async (_why, bad) => {
    const repo = new InMemoryEventRepository()
    const s = makeSnapshot()
    await repo.create(s)

    await expect(repo.setPin(s.id, bad, null)).rejects.toThrow('Invalid PIN format')
    await expect(repo.setPin(s.id, '123456', null)).resolves.toBeUndefined()
    await expect(repo.setPin(s.id, '1234', '123456')).resolves.toBeUndefined()
    await expect(repo.setPin(s.id, null, '1234')).resolves.toBeUndefined()
  })

  it('locks reads and refuses writes without the right PIN, and ignores a PIN on an unprotected event', async () => {
    const { repo, snapshot, id } = await pinned()

    expect(await repo.findById(id)).toEqual({ id, locked: true, hasPin: true })
    expect(await repo.findById(id, '0000')).toEqual({ id, locked: true, hasPin: true })
    expect(isLockedEvent(await repo.findById(id, '1234'))).toBe(false)
    expect((await readEvent(repo, id, '1234'))?.snapshot.hasPin).toBe(true)

    await expect(repo.update(id, snapshot, 2, null)).rejects.toBeInstanceOf(WrongPinError)
    await expect(repo.update(id, snapshot, 2, '0000')).rejects.toBeInstanceOf(WrongPinError)
    await expect(repo.update(id, snapshot, 2, '1234')).resolves.toMatchObject({ version: 3 })
    await expect(repo.setPin(id, '9999', '0000')).rejects.toBeInstanceOf(WrongPinError)
    await expect(repo.deleteEvent(id, '0000')).rejects.toBeInstanceOf(WrongPinError)

    const open = new InMemoryEventRepository()
    const s = makeSnapshot()
    await open.create(s)
    await expect(open.update(s.id, s, 1, '0000')).resolves.toMatchObject({ version: 2 })
    expect(await open.verifyPin(s.id, '0000')).toBe(true)
  })

  it('throttles after ten wrong guesses, even for the right PIN, until a verify clears it', async () => {
    const { repo, snapshot, id } = await pinned()

    await guess(repo, id, 9)
    expect(await repo.verifyPin(id, '1234')).toBe(true)
    await guess(repo, id, 10)

    await expect(repo.verifyPin(id, '1234')).rejects.toBeInstanceOf(RateLimitedError)
    await expect(repo.findById(id, '1234')).rejects.toBeInstanceOf(RateLimitedError)
    await expect(repo.update(id, snapshot, 2, '1234')).rejects.toBeInstanceOf(RateLimitedError)
    await expect(repo.setPin(id, null, '1234')).rejects.toBeInstanceOf(RateLimitedError)
    await expect(repo.deleteEvent(id, '1234')).rejects.toBeInstanceOf(RateLimitedError)
  })

  it('counts wrong PINs on reads and writes toward the throttle, and forgets them on delete', async () => {
    const { repo, snapshot, id } = await pinned()
    for (let i = 0; i < 5; i++) await repo.findById(id, '0000')
    for (let i = 0; i < 4; i++) await repo.update(id, snapshot, 2, '0000').catch(() => undefined)
    await expect(repo.update(id, snapshot, 2, '0000')).rejects.toBeInstanceOf(WrongPinError)
    await expect(repo.update(id, snapshot, 2, '0000')).rejects.toBeInstanceOf(RateLimitedError)

    const fresh = await pinned()
    await guess(fresh.repo, fresh.id, 9)
    await fresh.repo.deleteEvent(fresh.id, '1234')
    expect(await fresh.repo.findById(fresh.id)).toBeNull()
    await fresh.repo.create(fresh.snapshot)
    await fresh.repo.setPin(fresh.id, '1234', null)
    await guess(fresh.repo, fresh.id, 9)
    expect(await fresh.repo.verifyPin(fresh.id, '1234')).toBe(true)
  })
})

function makeSnapshotWithId(id: string): EventSnapshot {
  return { ...makeSnapshot(), id }
}
