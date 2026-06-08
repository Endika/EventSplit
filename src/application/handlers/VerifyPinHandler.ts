import type { IEventRepository } from '@/domain/repositories/IEventRepository'

/**
 * UX unlock check. Returns true when the event has no PIN or `pin` matches the
 * server-side hash. May throw RateLimitedError when the attempt cap is hit.
 */
export class VerifyPinHandler {
  constructor(private readonly repo: IEventRepository) {}

  execute(eventId: string, pin: string): Promise<boolean> {
    return this.repo.verifyPin(eventId, pin)
  }
}
