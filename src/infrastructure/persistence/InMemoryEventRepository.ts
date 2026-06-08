import type { EventSnapshot } from '@/domain/entities/Event'
import {
  type IEventRepository,
  type ReadResult,
  type SaveResult,
  VersionConflictError,
  WrongPinError,
  PayloadTooLargeError,
  RateLimitedError,
} from '@/domain/repositories/IEventRepository'

// Mirror of the SQL blob cap in the harden migration — keep in sync.
const MAX_EVENT_BYTES = 524288
// Mirror of the PIN throttle in the rate-limit migration (count-based; the SQL
// adds a 15-minute sliding window the fake doesn't model — the observable
// contract is the cap).
const PIN_ATTEMPT_LIMIT = 10

interface Row {
  snapshot: EventSnapshot
  version: number
  /** The edit PIN, stored separately from the blob (mirrors the server column). */
  pin: string | null
}

function byteLen(value: unknown): number {
  return JSON.stringify(value).length
}

/**
 * In-memory fake mirroring the server-side RPC semantics (PIN enforcement +
 * caps + throttle) so application-layer integration tests exercise real
 * behavior, not a passthrough.
 */
export class InMemoryEventRepository implements IEventRepository {
  private rows = new Map<string, Row>()
  private pinFails = new Map<string, number>()
  /** Test seam: counts full-snapshot downloads so callers can assert egress savings. */
  findByIdCalls = 0

  /** Throttle gate: raise once the failed-attempt cap is hit. */
  private pinGuard(id: string): void {
    if ((this.pinFails.get(id) ?? 0) >= PIN_ATTEMPT_LIMIT) throw new RateLimitedError()
  }

  /** Verify the supplied pin against a PIN-protected row, recording the attempt. */
  private checkPin(row: Row, id: string, pin: string | null): void {
    if (row.pin === null) return
    this.pinGuard(id)
    if (pin !== row.pin) {
      this.pinFails.set(id, (this.pinFails.get(id) ?? 0) + 1)
      throw new WrongPinError()
    }
    this.pinFails.delete(id)
  }

  /** Read snapshot reflects the derived `hasPin` flag, like the get_event RPC. */
  private read(row: Row): EventSnapshot {
    return { ...structuredClone(row.snapshot), hasPin: row.pin !== null }
  }

  async findById(id: string): Promise<ReadResult | null> {
    this.findByIdCalls++
    const row = this.rows.get(id)
    return row ? { snapshot: this.read(row), version: row.version, hasPin: row.pin !== null } : null
  }

  async getVersion(id: string): Promise<number | null> {
    return this.rows.get(id)?.version ?? null
  }

  async create(snapshot: EventSnapshot): Promise<SaveResult> {
    if (this.rows.has(snapshot.id)) throw new Error('Event already exists')
    if (byteLen(snapshot) > MAX_EVENT_BYTES) throw new PayloadTooLargeError()
    const row: Row = { snapshot: structuredClone(snapshot), version: 1, pin: null }
    this.rows.set(snapshot.id, row)
    return { snapshot: this.read(row), version: row.version }
  }

  async update(
    id: string,
    snapshot: EventSnapshot,
    expectedVersion: number,
    pin: string | null,
  ): Promise<SaveResult> {
    const row = this.rows.get(id)
    if (!row) throw new Error('Event not found')
    this.checkPin(row, id, pin)
    if (row.version !== expectedVersion) throw new VersionConflictError(row.version)
    if (byteLen(snapshot) > MAX_EVENT_BYTES) throw new PayloadTooLargeError()
    row.snapshot = structuredClone(snapshot)
    row.version += 1
    return { snapshot: this.read(row), version: row.version }
  }

  async setPin(id: string, newPin: string | null, currentPin: string | null): Promise<void> {
    const row = this.rows.get(id)
    if (!row) throw new Error('Event not found')
    this.checkPin(row, id, currentPin)
    if (newPin !== null && !/^\d{4,6}$/.test(newPin)) throw new Error('Invalid PIN format')
    row.pin = newPin
    row.version += 1
  }

  async verifyPin(id: string, pin: string): Promise<boolean> {
    const row = this.rows.get(id)
    if (!row) return false
    if (row.pin === null) return true
    this.pinGuard(id)
    if (row.pin === pin) {
      this.pinFails.delete(id)
      return true
    }
    this.pinFails.set(id, (this.pinFails.get(id) ?? 0) + 1)
    return false
  }

  async deleteEvent(id: string, pin: string | null): Promise<void> {
    const row = this.rows.get(id)
    if (!row) throw new Error('Event not found')
    this.checkPin(row, id, pin)
    this.rows.delete(id)
    this.pinFails.delete(id)
  }
}
