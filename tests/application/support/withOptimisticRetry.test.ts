import { afterEach, describe, it, expect, vi } from 'vitest'
import { CreateEventHandler } from '@/application/handlers/CreateEventHandler'
import { withOptimisticRetry } from '@/application/support/withOptimisticRetry'
import { InMemoryEventRepository } from '@/infrastructure/persistence/InMemoryEventRepository'
import {
  ConcurrencyLimitError,
  type IEventRepository,
  WrongPinError,
} from '@/domain/repositories/IEventRepository'
import { ConflictingRepository } from '../../support/ConflictingRepository'

const pinNoops = {
  setPin: async () => {},
  verifyPin: async () => true,
  deleteEvent: async () => {},
}

async function seed(repo: IEventRepository) {
  const created = await new CreateEventHandler(repo).execute({ name: 'Trip', creatorName: 'John' })
  return created.event.id
}

describe('withOptimisticRetry', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('retries on VersionConflictError, waiting out the backoff, and eventually succeeds', async () => {
    vi.useFakeTimers()
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const inner = new InMemoryEventRepository()
    const eventId = await seed(inner)
    const repo = new ConflictingRepository(inner, 1)

    let mutateRuns = 0
    let settled = false
    const pending = withOptimisticRetry(repo, eventId, (row) => {
      mutateRuns++
      return { ...row.snapshot, name: 'Renamed' }
    }).finally(() => {
      settled = true
    })
    await vi.advanceTimersByTimeAsync(29)
    expect(settled).toBe(false) // the first backoff is 30 ms
    await vi.advanceTimersByTimeAsync(1)
    const saved = await pending

    expect(mutateRuns).toBe(2)
    expect(repo.updateCalls).toBe(2)
    expect(saved.snapshot.name).toBe('Renamed')
    // started at version 1, one successful update bumps to 2
    expect(saved.version).toBe(2)
  })

  it('propagates a non-conflict error from update without retrying', async () => {
    const inner = new InMemoryEventRepository()
    const eventId = await seed(inner)
    let updateCalls = 0
    const repo: IEventRepository = {
      findById: (id) => inner.findById(id),
      getVersion: (id) => inner.getVersion(id),
      create: (s) => inner.create(s),
      update: async () => {
        updateCalls++
        throw new Error('database exploded')
      },
      ...pinNoops,
    }

    await expect(withOptimisticRetry(repo, eventId, (row) => row.snapshot)).rejects.toThrow(
      'database exploded',
    )
    expect(updateCalls).toBe(1)
  })

  it('throws ConcurrencyLimitError after exhausting retries, sleeping between attempts', async () => {
    const inner = new InMemoryEventRepository()
    const eventId = await seed(inner)
    const repo = new ConflictingRepository(inner, Number.POSITIVE_INFINITY)
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const sleeps: number[] = []
    const sleep = (ms: number) => {
      sleeps.push(ms)
      return Promise.resolve()
    }

    await expect(
      withOptimisticRetry(repo, eventId, (row) => row.snapshot, { sleep }),
    ).rejects.toBeInstanceOf(ConcurrencyLimitError)
    expect(repo.updateCalls).toBe(6) // DEFAULT_MAX_RETRIES
    // Half of the doubling cap (60, 120, 240, 480, then 600), no sleep after the last attempt.
    expect(sleeps).toEqual([30, 60, 120, 240, 300])
  })

  it('passes the unlocked PIN to the repository so a protected event can be written', async () => {
    const inner = new InMemoryEventRepository()
    const eventId = await seed(inner)
    await inner.setPin(eventId, '1234', null)

    await expect(
      withOptimisticRetry(inner, eventId, (row) => row.snapshot, { pin: '1234' }),
    ).resolves.toMatchObject({ version: 3 })
    await expect(withOptimisticRetry(inner, eventId, (row) => row.snapshot)).rejects.toBeInstanceOf(
      WrongPinError,
    )
  })

  it('throws "Event not found" when the row is missing', async () => {
    const repo = new InMemoryEventRepository()
    await expect(withOptimisticRetry(repo, 'missing-id', (row) => row.snapshot)).rejects.toThrow(
      'Event not found',
    )
  })
})
