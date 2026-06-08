import { describe, it, expect } from 'vitest'
import { CreateEventHandler } from '@/application/handlers/CreateEventHandler'
import { withOptimisticRetry } from '@/application/support/withOptimisticRetry'
import { InMemoryEventRepository } from '@/infrastructure/persistence/InMemoryEventRepository'
import type { EventSnapshot } from '@/domain/entities/Event'
import {
  ConcurrencyLimitError,
  type IEventRepository,
  type ReadResult,
  type SaveResult,
  VersionConflictError,
} from '@/domain/repositories/IEventRepository'

/** Round out a partial repo with the PIN methods the retry helper never touches. */
const pinNoops = {
  setPin: async () => {},
  verifyPin: async () => true,
  deleteEvent: async () => {},
}

const noSleep = () => Promise.resolve()

/**
 * Wraps a real repository and throws VersionConflictError on the first N update
 * calls (simulating a concurrent writer winning the race), then delegates.
 */
class ConflictingRepository implements IEventRepository {
  updateCalls = 0
  setPin = pinNoops.setPin
  verifyPin = pinNoops.verifyPin
  deleteEvent = pinNoops.deleteEvent
  constructor(
    private readonly inner: IEventRepository,
    private readonly conflictsBeforeSuccess: number,
  ) {}

  findById(id: string): Promise<ReadResult | null> {
    return this.inner.findById(id)
  }
  getVersion(id: string) {
    return this.inner.getVersion(id)
  }
  create(snapshot: EventSnapshot) {
    return this.inner.create(snapshot)
  }
  async update(
    id: string,
    snapshot: EventSnapshot,
    expectedVersion: number,
    pin: string | null,
  ): Promise<SaveResult> {
    this.updateCalls++
    if (this.updateCalls <= this.conflictsBeforeSuccess) {
      // Report a stale-version style conflict without mutating the inner row,
      // so the next attempt re-reads the still-current version and can succeed.
      const current = await this.inner.getVersion(id)
      throw new VersionConflictError(current ?? expectedVersion)
    }
    return this.inner.update(id, snapshot, expectedVersion, pin)
  }
}

async function seed(repo: IEventRepository) {
  const created = await new CreateEventHandler(repo).execute({ name: 'Trip', creatorName: 'John' })
  return created.event.id
}

describe('withOptimisticRetry', () => {
  it('retries on VersionConflictError and eventually succeeds, running mutate again', async () => {
    const inner = new InMemoryEventRepository()
    const eventId = await seed(inner)
    const repo = new ConflictingRepository(inner, 1)

    let mutateRuns = 0
    const saved = await withOptimisticRetry(
      repo,
      eventId,
      (row) => {
        mutateRuns++
        return { ...row.snapshot, name: 'Renamed' }
      },
      { sleep: noSleep },
    )

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
    const sleeps: number[] = []
    const sleep = (ms: number) => {
      sleeps.push(ms)
      return Promise.resolve()
    }

    await expect(
      withOptimisticRetry(repo, eventId, (row) => row.snapshot, { sleep }),
    ).rejects.toBeInstanceOf(ConcurrencyLimitError)
    expect(repo.updateCalls).toBe(6) // DEFAULT_MAX_RETRIES
    expect(sleeps).toHaveLength(5) // one fewer than attempts — no sleep after the last
  })

  it('respects a custom maxRetries budget', async () => {
    const inner = new InMemoryEventRepository()
    const eventId = await seed(inner)
    const repo = new ConflictingRepository(inner, Number.POSITIVE_INFINITY)

    await expect(
      withOptimisticRetry(repo, eventId, (row) => row.snapshot, {
        maxRetries: 2,
        sleep: noSleep,
      }),
    ).rejects.toBeInstanceOf(ConcurrencyLimitError)
    expect(repo.updateCalls).toBe(2)
  })

  it('throws "Event not found" when the row is missing', async () => {
    const repo = new InMemoryEventRepository()
    await expect(withOptimisticRetry(repo, 'missing-id', (row) => row.snapshot)).rejects.toThrow(
      'Event not found',
    )
  })
})
