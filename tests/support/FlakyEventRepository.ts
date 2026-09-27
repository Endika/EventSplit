import type { LockedEvent, ReadResult } from '@/domain/repositories/IEventRepository'
import { InMemoryEventRepository } from '@/infrastructure/persistence/InMemoryEventRepository'

/** Wraps the in-memory fake to simulate a dead network on reads, on demand. */
export class FlakyEventRepository extends InMemoryEventRepository {
  failReads = false

  override async findById(
    id: string,
    pin: string | null = null,
  ): Promise<ReadResult | LockedEvent | null> {
    if (this.failReads) throw new Error('simulated network failure')
    return super.findById(id, pin)
  }

  override async getVersion(id: string): Promise<number | null> {
    if (this.failReads) throw new Error('simulated network failure')
    return super.getVersion(id)
  }
}
