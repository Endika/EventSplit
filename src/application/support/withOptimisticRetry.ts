import type { EventSnapshot } from '@/domain/entities/Event'
import {
  ConcurrencyLimitError,
  type IEventRepository,
  type SaveResult,
  VersionConflictError,
} from '@/domain/repositories/IEventRepository'

const DEFAULT_MAX_RETRIES = 6
const BASE_DELAY_MS = 60
const MAX_DELAY_MS = 600

/**
 * Full-jitter exponential backoff. The whole event is a single row with one
 * version, so every participant's write contends on the same optimistic lock;
 * spacing retries with randomised delays keeps contending clients from
 * ping-ponging and exhausting their budget in a burst. Exported for testing.
 */
export function backoffDelayMs(attempt: number): number {
  const cap = Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** attempt)
  return Math.floor(Math.random() * cap)
}

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

export interface RetryOptions {
  maxRetries?: number
  /** Injectable for tests so retry behaviour can be exercised without real timers. */
  sleep?: (ms: number) => Promise<void>
}

/**
 * Runs an optimistic read-modify-write against an event row, retrying on
 * VersionConflictError with jittered backoff between attempts. `mutate` receives
 * the freshly-read row and returns the next snapshot (or throws a validation
 * error). Throws ConcurrencyLimitError once the retry budget is exhausted.
 */
export async function withOptimisticRetry(
  repo: IEventRepository,
  eventId: string,
  mutate: (row: { snapshot: EventSnapshot; version: number }) => EventSnapshot,
  opts: RetryOptions = {},
): Promise<SaveResult> {
  const maxRetries = opts.maxRetries ?? DEFAULT_MAX_RETRIES
  const sleep = opts.sleep ?? defaultSleep

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const row = await repo.findById(eventId)
    if (!row) throw new Error('Event not found')
    const next = mutate(row)
    try {
      return await repo.update(eventId, next, row.version)
    } catch (err) {
      if (!(err instanceof VersionConflictError)) throw err
      // Don't sleep after the final attempt — we're about to give up.
      if (attempt < maxRetries - 1) await sleep(backoffDelayMs(attempt))
    }
  }
  throw new ConcurrencyLimitError()
}
