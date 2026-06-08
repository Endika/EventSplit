import type { EventSnapshot } from '@/domain/entities/Event'
import type {
  IEventRepository,
  ReadResult,
  SaveResult,
} from '@/domain/repositories/IEventRepository'
import type { UnlockedPinHolder } from '@/shared/di/UnlockedPinHolder'

/**
 * Decorator over an {@link IEventRepository} that injects the session-unlocked
 * edit PIN held by an {@link UnlockedPinHolder} into the PIN-bearing methods
 * whenever the caller passed `null`.
 *
 * This is the fix for the regression where collaborative write handlers call
 * `withOptimisticRetry(repo, id, mutate)` with no PIN → `repo.update(..., null)`,
 * which a PIN-protected event's server-side check rejects. Rather than thread the
 * PIN through ~28 handler signatures, the holder carries it and this decorator
 * fills it in transparently. An explicit non-null PIN from the caller (e.g. a
 * privileged host edit that already holds it) always wins.
 */
export class PinForwardingEventRepository implements IEventRepository {
  constructor(
    private readonly inner: IEventRepository,
    private readonly holder: UnlockedPinHolder,
  ) {}

  findById(id: string): Promise<ReadResult | null> {
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
    return this.inner.update(id, snapshot, expectedVersion, pin ?? this.holder.get())
  }

  setPin(id: string, newPin: string | null, currentPin: string | null): Promise<void> {
    return this.inner.setPin(id, newPin, currentPin ?? this.holder.get())
  }

  verifyPin(id: string, pin: string): Promise<boolean> {
    return this.inner.verifyPin(id, pin)
  }

  deleteEvent(id: string, pin: string | null): Promise<void> {
    return this.inner.deleteEvent(id, pin ?? this.holder.get())
  }
}
