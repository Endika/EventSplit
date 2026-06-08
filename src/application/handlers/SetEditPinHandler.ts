import { SetEditPinSchema, type SetEditPinInput } from '@/application/dtos/SetEditPinDTO'
import type { IEventRepository } from '@/domain/repositories/IEventRepository'

/**
 * Sets, changes or removes the edit PIN. Hashing happens server-side
 * (set_event_pin); the plaintext never lands in a blob and no history entry is
 * written for it (decision: accepted — the PIN hash is no longer part of the
 * snapshot, so there is nothing to optimistically read-modify-write).
 */
export class SetEditPinHandler {
  constructor(private readonly repo: IEventRepository) {}

  async execute(input: SetEditPinInput): Promise<void> {
    const parsed = SetEditPinSchema.parse(input)
    await this.repo.setPin(parsed.eventId, parsed.pin, parsed.currentPin ?? null)
  }
}
