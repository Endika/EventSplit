import type { EventSnapshot } from '@/domain/entities/Event'
import type { IEventChangeNotifier } from '@/domain/ports/IEventChangeNotifier'
import type { IEventRepository, SaveResult } from '@/domain/repositories/IEventRepository'

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

  findById(id: string): Promise<{ snapshot: EventSnapshot; version: number } | null> {
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
  ): Promise<SaveResult> {
    const result = await this.inner.update(id, snapshot, expectedVersion)
    this.notifier.publish(id, result.version)
    return result
  }
}
