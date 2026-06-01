import type { EventSnapshot } from '@/domain/entities/Event'

export interface SaveResult {
  snapshot: EventSnapshot
  version: number
}

export class VersionConflictError extends Error {
  constructor(readonly currentVersion: number) {
    super(`Version conflict: server is at ${currentVersion}`)
  }
}

/**
 * Thrown when the server rejects a write because this client runs an older
 * schema than the stored event (the guard trigger raises SQLSTATE PT426, which
 * PostgREST maps to HTTP 426 Upgrade Required). The UI turns this into a
 * "please update" prompt instead of a generic error.
 */
export class StaleClientError extends Error {
  readonly code = 'STALE_CLIENT'
  constructor() {
    super('Client schema is older than the stored event; an update is required')
    this.name = 'StaleClientError'
  }
}

/**
 * Thrown when an optimistic read-modify-write keeps losing the version race
 * until the retry budget is exhausted (many participants writing the single
 * event row at once). The UI turns this into a friendly "try again" message
 * instead of leaking the raw English error text.
 */
export class ConcurrencyLimitError extends Error {
  readonly code = 'CONCURRENCY_LIMIT'
  constructor() {
    super('Could not save after retries: too many concurrent writes')
    this.name = 'ConcurrencyLimitError'
  }
}

export interface IEventRepository {
  findById(id: string): Promise<{ snapshot: EventSnapshot; version: number } | null>
  /** Cheap version probe: avoids downloading the full snapshot when nothing changed. */
  getVersion(id: string): Promise<number | null>
  create(snapshot: EventSnapshot): Promise<SaveResult>
  update(id: string, snapshot: EventSnapshot, expectedVersion: number): Promise<SaveResult> // throws VersionConflictError on mismatch, StaleClientError if our schema is stale
}
