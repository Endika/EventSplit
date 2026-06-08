import type { EventSnapshot } from '@/domain/entities/Event'
import type { IEventChangeNotifier } from '@/domain/ports/IEventChangeNotifier'
import type {
  IEventRepository,
  ReadResult,
  SaveResult,
} from '@/domain/repositories/IEventRepository'

/**
 * Decorator over an {@link IEventRepository} that publishes a lightweight
 * version notification after every successful write. Read methods pass straight
 * through. Keeping this in a decorator leaves the write use-cases untouched
 * (Open/Closed) and the persistence adapter free of any fan-out concern.
 */
export class NotifyingEventRepository implements IEventRepository {
  constructor(
    private readonly inner: IEventRepository,
    private readonly notifier: IEventChangeNotifier,
  ) {}

  findById(id: string): Promise<ReadResult | null> {
    return this.inner.findById(id)
  }

  getVersion(id: string): Promise<number | null> {
    return this.inner.getVersion(id)
  }

  async create(snapshot: EventSnapshot): Promise<SaveResult> {
    const result = await this.inner.create(snapshot)
    this.notifier.publish(snapshot.id, result.version)
    return result
  }

  async update(
    id: string,
    snapshot: EventSnapshot,
    expectedVersion: number,
    pin: string | null,
  ): Promise<SaveResult> {
    const result = await this.inner.update(id, snapshot, expectedVersion, pin)
    this.notifier.publish(id, result.version)
    return result
  }

  setPin(id: string, newPin: string | null, currentPin: string | null): Promise<void> {
    return this.inner.setPin(id, newPin, currentPin)
  }

  verifyPin(id: string, pin: string): Promise<boolean> {
    return this.inner.verifyPin(id, pin)
  }

  async deleteEvent(id: string, pin: string | null): Promise<void> {
    await this.inner.deleteEvent(id, pin)
    // No new version exists after a delete; the ping just nudges other clients
    // to reconcile, where get_event returns null → they treat it as removed.
    this.notifier.publish(id, -1)
  }
}
