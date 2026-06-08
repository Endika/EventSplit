import type { IEventRepository } from '@/domain/repositories/IEventRepository'

/**
 * Erasure use-case: hard-deletes the event. PIN-gated server-side — pass the
 * unlocked edit PIN (null for a PIN-less event). Throws WrongPinError /
 * RateLimitedError from the repository.
 */
export class DeleteEventHandler {
  constructor(private readonly repo: IEventRepository) {}

  async execute(eventId: string, pin: string | null): Promise<void> {
    await this.repo.deleteEvent(eventId, pin)
  }
}
