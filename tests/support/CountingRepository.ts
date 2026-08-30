import type { EventSnapshot } from '@/domain/entities/Event'
import type {
  IEventRepository,
  ReadResult,
  SaveResult,
} from '@/domain/repositories/IEventRepository'

/**
 * Counts reads and writes without faking behaviour: it delegates to the real
 * repository it wraps. An event is one JSONB blob that every connected client
 * re-downloads on each write, so the write count *is* the egress bill.
 */
export class CountingRepository implements IEventRepository {
  updates = 0
  reads = 0

  constructor(private readonly inner: IEventRepository) {}

  findById(id: string): Promise<ReadResult | null> {
    this.reads += 1
    return this.inner.findById(id)
  }
  getVersion(id: string): Promise<number | null> {
    return this.inner.getVersion(id)
  }
  create(snapshot: EventSnapshot): Promise<SaveResult> {
    return this.inner.create(snapshot)
  }
  update(
    id: string,
    snapshot: EventSnapshot,
    expectedVersion: number,
    pin: string | null,
  ): Promise<SaveResult> {
    this.updates += 1
    return this.inner.update(id, snapshot, expectedVersion, pin)
  }
  setPin(id: string, newPin: string | null, currentPin: string | null): Promise<void> {
    return this.inner.setPin(id, newPin, currentPin)
  }
  verifyPin(id: string, pin: string): Promise<boolean> {
    return this.inner.verifyPin(id, pin)
  }
  deleteEvent(id: string, pin: string | null): Promise<void> {
    return this.inner.deleteEvent(id, pin)
  }
}
