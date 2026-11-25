import type { EventSnapshot } from '@/domain/entities/Event'
import {
  type IEventRepository,
  type LockedEvent,
  type ReadResult,
  type SaveResult,
  VersionConflictError,
} from '@/domain/repositories/IEventRepository'

/**
 * Wraps a real repository and throws VersionConflictError on the first N update
 * calls (simulating a concurrent writer winning the race), then delegates.
 */
export class ConflictingRepository implements IEventRepository {
  updateCalls = 0
  setPin = async () => {}
  verifyPin = async () => true
  deleteEvent = async () => {}
  constructor(
    private readonly inner: IEventRepository,
    private readonly conflictsBeforeSuccess: number,
  ) {}

  findById(id: string, pin?: string | null): Promise<ReadResult | LockedEvent | null> {
    return this.inner.findById(id, pin)
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
