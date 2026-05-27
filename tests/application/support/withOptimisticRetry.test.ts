import { describe, it, expect } from 'vitest'
import { CreateEventHandler } from '@/application/handlers/CreateEventHandler'
import { withOptimisticRetry } from '@/application/support/withOptimisticRetry'
import { InMemoryEventRepository } from '@/infrastructure/persistence/InMemoryEventRepository'
import type { EventSnapshot } from '@/domain/entities/Event'
import {
  type IEventRepository,
  type SaveResult,
  VersionConflictError,
} from '@/domain/repositories/IEventRepository'

/**
 * Wraps a real repository and throws VersionConflictError on the first N update
 * calls (simulating a concurrent writer winning the race), then delegates.
 */
class ConflictingRepository implements IEventRepository {
  updateCalls = 0
  constructor(
    private readonly inner: IEventRepository,
    private readonly conflictsBeforeSuccess: number,
  ) {}

  findById(id: string) {
    return this.inner.findById(id)
  }
  getVersion(id: string) {
    return this.inner.getVersion(id)
  }
  create(snapshot: EventSnapshot) {
    return this.inner.create(snapshot)
  }
  async update(id: string, snapshot: EventSnapshot, expectedVersion: number): Promise<SaveResult> {
    this.updateCalls++
    if (this.updateCalls <= this.conflictsBeforeSuccess) {
      // Report a stale-version style conflict without mutating the inner row,
      // so the next attempt re-reads the still-current version and can succeed.
      const current = await this.inner.getVersion(id)
      throw new VersionConflictError(current ?? expectedVersion)
    }
    return this.inner.update(id, snapshot, expectedVersion)
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
    const saved = await withOptimisticRetry(repo, eventId, (row) => {
      mutateRuns++
      return { ...row.snapshot, name: 'Renamed' }
    })

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
    }

    await expect(
      withOptimisticRetry(repo, eventId, (row) => row.snapshot),
    ).rejects.toThrow('database exploded')
    expect(updateCalls).toBe(1)
  })

  it('throws after exhausting retries when every update conflicts', async () => {
    const inner = new InMemoryEventRepository()
    const eventId = await seed(inner)
    const repo = new ConflictingRepository(inner, Number.POSITIVE_INFINITY)

    await expect(
      withOptimisticRetry(repo, eventId, (row) => row.snapshot),
    ).rejects.toThrow('Could not save: too many concurrent writes')
    expect(repo.updateCalls).toBe(3)
  })

  it('throws "Event not found" when the row is missing', async () => {
    const repo = new InMemoryEventRepository()
    await expect(
      withOptimisticRetry(repo, 'missing-id', (row) => row.snapshot),
    ).rejects.toThrow('Event not found')
  })
})
