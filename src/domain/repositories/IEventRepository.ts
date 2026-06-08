import type { EventSnapshot } from '@/domain/entities/Event'

export interface SaveResult {
  snapshot: EventSnapshot
  version: number
}

/**
 * Read result. `hasPin` replaces the old shipped PIN hash — the hash never
 * leaves the server now (it lives in a column, gated by the RPCs).
 */
export interface ReadResult {
  snapshot: EventSnapshot
  version: number
  hasPin: boolean
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

/** Server rejected a privileged write because the supplied edit PIN was wrong or missing. */
export class WrongPinError extends Error {
  readonly code = 'WRONG_PIN'
  constructor() {
    super('Wrong or missing edit PIN')
    this.name = 'WrongPinError'
  }
}

/** Server rejected a write because it would exceed the blob size cap. */
export class PayloadTooLargeError extends Error {
  readonly code = 'PAYLOAD_TOO_LARGE'
  constructor() {
    super('Payload exceeds the allowed size limit')
    this.name = 'PayloadTooLargeError'
  }
}

/** Server rejected a PIN attempt because too many failures happened in the window. */
export class RateLimitedError extends Error {
  readonly code = 'RATE_LIMITED'
  constructor() {
    super('Too many PIN attempts; try again later')
    this.name = 'RateLimitedError'
  }
}

export interface IEventRepository {
  findById(id: string): Promise<ReadResult | null>
  /** Cheap version probe: avoids downloading the full snapshot when nothing changed. */
  getVersion(id: string): Promise<number | null>
  create(snapshot: EventSnapshot): Promise<SaveResult>
  /**
   * Optimistic-concurrency write, PIN-gated server-side. `pin` is the unlocked
   * edit PIN (null for a PIN-less event or a collaborative guest write).
   * Throws VersionConflictError / StaleClientError / WrongPinError /
   * PayloadTooLargeError / RateLimitedError.
   */
  update(
    id: string,
    snapshot: EventSnapshot,
    expectedVersion: number,
    pin: string | null,
  ): Promise<SaveResult>
  /** Set / change / remove the edit PIN. Changing or removing requires `currentPin`. */
  setPin(id: string, newPin: string | null, currentPin: string | null): Promise<void>
  /** UX unlock check: true when there is no PIN or `pin` matches. */
  verifyPin(id: string, pin: string): Promise<boolean>
  /** Erasure: hard-delete the event (PIN-gated server-side when a PIN is set). */
  deleteEvent(id: string, pin: string | null): Promise<void>
}
