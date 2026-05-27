import type { EventSnapshot } from '@/domain/entities/Event'
import {
  type IEventRepository,
  type SaveResult,
  VersionConflictError,
} from '@/domain/repositories/IEventRepository'

const MAX_RETRIES = 3

/**
 * Runs an optimistic read-modify-write against an event row, retrying on
 * VersionConflictError. `mutate` receives the freshly-read row and returns the
 * next snapshot (or throws a validation error). Side values can be captured via
 * closure in the caller.
 */
export async function withOptimisticRetry(
  repo: IEventRepository,
  eventId: string,
  mutate: (row: { snapshot: EventSnapshot; version: number }) => EventSnapshot,
): Promise<SaveResult> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const row = await repo.findById(eventId)
    if (!row) throw new Error('Event not found')
    const next = mutate(row)
    try {
      return await repo.update(eventId, next, row.version)
    } catch (err) {
      if (!(err instanceof VersionConflictError)) throw err
    }
  }
  throw new Error('Could not save: too many concurrent writes')
}
