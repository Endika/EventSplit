import { describe, it, expect } from 'vitest'
import { InMemoryEventRepository } from '@/infrastructure/persistence/InMemoryEventRepository'
import {
  isLockedEvent,
  PayloadTooLargeError,
  RateLimitedError,
  WrongPinError,
} from '@/domain/repositories/IEventRepository'
import { CreateEventHandler } from '@/application/handlers/CreateEventHandler'
import { SetEditPinHandler } from '@/application/handlers/SetEditPinHandler'
import { DeleteEventHandler } from '@/application/handlers/DeleteEventHandler'
import { EditEventDetailsHandler } from '@/application/handlers/EditEventDetailsHandler'
import { Event } from '@/domain/entities/Event'
import { User } from '@/domain/entities/User'
import { readEvent } from '../support/readEvent'

async function freshEvent(repo: InMemoryEventRepository): Promise<{ id: string; userId: string }> {
  const r = await new CreateEventHandler(repo).execute({ name: 'Trip', creatorName: 'John' })
  return { id: r.event.id, userId: r.creator.id }
}

describe('server-side PIN enforcement (via the in-memory fake)', () => {
  it('lets a PIN-less event be edited without a PIN', async () => {
    const repo = new InMemoryEventRepository()
    const { id } = await freshEvent(repo)
    await new EditEventDetailsHandler(repo).execute({ eventId: id, name: 'Renamed Trip' })
    expect((await readEvent(repo, id))?.snapshot.name).toBe('Renamed Trip')
  })

  it('rejects a privileged write with a wrong PIN on a PIN-protected event', async () => {
    const repo = new InMemoryEventRepository()
    const { id, userId } = await freshEvent(repo)
    await new SetEditPinHandler(repo).execute({ eventId: id, userId, pin: '1234' })
    const row = await readEvent(repo, id, '1234')
    await expect(repo.update(id, row!.snapshot, row!.version, '0000')).rejects.toBeInstanceOf(
      WrongPinError,
    )
  })

  it('accepts a privileged write with the correct PIN', async () => {
    const repo = new InMemoryEventRepository()
    const { id, userId } = await freshEvent(repo)
    await new SetEditPinHandler(repo).execute({ eventId: id, userId, pin: '1234' })
    const row = await readEvent(repo, id, '1234')
    const next = { ...row!.snapshot, name: 'Locked Trip' }
    const saved = await repo.update(id, next, row!.version, '1234')
    expect(saved.snapshot.name).toBe('Locked Trip')
  })
})

describe('blob size cap', () => {
  it('rejects an oversize update with PayloadTooLargeError', async () => {
    const repo = new InMemoryEventRepository()
    const { id } = await freshEvent(repo)
    const row = await readEvent(repo, id)
    const huge = { ...row!.snapshot, generalNotes: 'x'.repeat(600_000) }
    await expect(repo.update(id, huge, row!.version, null)).rejects.toBeInstanceOf(
      PayloadTooLargeError,
    )
  })

  it('rejects an oversize create with PayloadTooLargeError', async () => {
    const repo = new InMemoryEventRepository()
    const snapshot = Event.create({
      name: 'Trip',
      creator: User.create({ name: 'John' }),
    }).toSnapshot()
    snapshot.generalNotes = 'x'.repeat(600_000)
    await expect(repo.create(snapshot)).rejects.toBeInstanceOf(PayloadTooLargeError)
  })
})

describe('PIN throttle', () => {
  it('throttles PIN guessing once the attempt cap is hit', async () => {
    const repo = new InMemoryEventRepository()
    const { id, userId } = await freshEvent(repo)
    await new SetEditPinHandler(repo).execute({ eventId: id, userId, pin: '1234' })
    for (let i = 0; i < 10; i++) expect(await repo.verifyPin(id, '0000')).toBe(false)
    await expect(repo.verifyPin(id, '0000')).rejects.toBeInstanceOf(RateLimitedError)
    // even the correct PIN is blocked while throttled
    await expect(repo.verifyPin(id, '1234')).rejects.toBeInstanceOf(RateLimitedError)
  })

  it('a correct PIN before the cap clears the failure counter', async () => {
    const repo = new InMemoryEventRepository()
    const { id, userId } = await freshEvent(repo)
    await new SetEditPinHandler(repo).execute({ eventId: id, userId, pin: '1234' })
    for (let i = 0; i < 9; i++) await repo.verifyPin(id, '0000')
    expect(await repo.verifyPin(id, '1234')).toBe(true) // resets the counter
    for (let i = 0; i < 9; i++) await repo.verifyPin(id, '0000')
    expect(await repo.verifyPin(id, '1234')).toBe(true) // still not throttled
  })
})

describe('erasure', () => {
  it('deletes a PIN-gated event with the correct PIN and rejects a wrong one', async () => {
    const repo = new InMemoryEventRepository()
    const { id, userId } = await freshEvent(repo)
    await new SetEditPinHandler(repo).execute({ eventId: id, userId, pin: '1234' })
    await expect(new DeleteEventHandler(repo).execute(id, '0000')).rejects.toBeInstanceOf(
      WrongPinError,
    )
    await new DeleteEventHandler(repo).execute(id, '1234')
    expect(await readEvent(repo, id)).toBeNull()
  })

  it('deletes a PIN-less event without a PIN', async () => {
    const repo = new InMemoryEventRepository()
    const { id } = await freshEvent(repo)
    await new DeleteEventHandler(repo).execute(id, null)
    expect(await readEvent(repo, id)).toBeNull()
  })
})

describe('read shape', () => {
  it('exposes hasPin and never ships a PIN hash / editPin field', async () => {
    const repo = new InMemoryEventRepository()
    const { id, userId } = await freshEvent(repo)

    const before = await readEvent(repo, id)
    expect(before?.hasPin).toBe(false)
    expect(before?.snapshot.hasPin).toBe(false)
    expect('editPin' in (before!.snapshot as unknown as Record<string, unknown>)).toBe(false)

    await new SetEditPinHandler(repo).execute({ eventId: id, userId, pin: '1234' })
    const after = await readEvent(repo, id, '1234')
    expect(after?.hasPin).toBe(true)
    // Quoted: a bare 1234 also turns up inside a random UUID often enough to flake.
    expect(JSON.stringify(after?.snapshot)).not.toContain('"1234"')
    expect('editPin' in (after!.snapshot as unknown as Record<string, unknown>)).toBe(false)
  })
})

describe('PIN-gated reads', () => {
  async function pinned(repo: InMemoryEventRepository) {
    const { id, userId } = await freshEvent(repo)
    await new SetEditPinHandler(repo).execute({ eventId: id, userId, pin: '1234' })
    return id
  }

  it('returns only a locked marker, no data, when no PIN is offered', async () => {
    const repo = new InMemoryEventRepository()
    const id = await pinned(repo)
    expect(await repo.findById(id)).toEqual({ id, locked: true, hasPin: true })
  })

  it('does not count a read without a PIN as a failed guess', async () => {
    const repo = new InMemoryEventRepository()
    const id = await pinned(repo)
    for (let i = 0; i < 12; i++) await repo.findById(id)
    expect(isLockedEvent(await repo.findById(id, '1234'))).toBe(false)
  })

  it('stays locked with a wrong PIN, and throttles once the guesses hit the cap', async () => {
    const repo = new InMemoryEventRepository()
    const id = await pinned(repo)
    for (let i = 0; i < 10; i++) expect(isLockedEvent(await repo.findById(id, '0000'))).toBe(true)
    await expect(repo.findById(id, '0000')).rejects.toBeInstanceOf(RateLimitedError)
    await expect(repo.findById(id, '1234')).rejects.toBeInstanceOf(RateLimitedError)
    // Reads and PIN checks share the one throttle.
    await expect(repo.verifyPin(id, '1234')).rejects.toBeInstanceOf(RateLimitedError)
  })

  it('returns the event with the right PIN', async () => {
    const repo = new InMemoryEventRepository()
    const id = await pinned(repo)
    const read = await readEvent(repo, id, '1234')
    expect(read?.snapshot.name).toBe('Trip')
    expect(read?.hasPin).toBe(true)
  })

  it('leaves a PIN-less event readable by anyone, whatever PIN comes along', async () => {
    const repo = new InMemoryEventRepository()
    const { id } = await freshEvent(repo)
    expect((await readEvent(repo, id))?.snapshot.name).toBe('Trip')
    expect((await readEvent(repo, id, '9999'))?.snapshot.name).toBe('Trip')
  })

  it('refuses a collaborative write when the event cannot be read', async () => {
    const repo = new InMemoryEventRepository()
    const id = await pinned(repo)
    await expect(
      new EditEventDetailsHandler(repo).execute({ eventId: id, name: 'Sneaky' }),
    ).rejects.toBeInstanceOf(WrongPinError)
    expect((await readEvent(repo, id, '1234'))?.snapshot.name).toBe('Trip')
  })
})
