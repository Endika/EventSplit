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

export interface IEventRepository {
  findById(id: string): Promise<{ snapshot: EventSnapshot; version: number } | null>
  /** Cheap version probe: avoids downloading the full snapshot when nothing changed. */
  getVersion(id: string): Promise<number | null>
  create(snapshot: EventSnapshot): Promise<SaveResult>
  update(id: string, snapshot: EventSnapshot, expectedVersion: number): Promise<SaveResult> // throws VersionConflictError on mismatch, StaleClientError if our schema is stale
}
