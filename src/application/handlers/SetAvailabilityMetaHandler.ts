import { SetAvailabilityMetaSchema, type SetAvailabilityMetaInput } from '@/application/dtos/SetAvailabilityMetaDTO'
import { Event, type EventSnapshot } from '@/domain/entities/Event'
import type { IEventRepository } from '@/domain/repositories/IEventRepository'
import { withOptimisticRetry } from '@/application/support/withOptimisticRetry'

export class SetAvailabilityMetaHandler {
  constructor(private readonly repo: IEventRepository) {}

  async execute(input: SetAvailabilityMetaInput): Promise<{ event: EventSnapshot; version: number }> {
    const parsed = SetAvailabilityMetaSchema.parse(input)
    const saved = await withOptimisticRetry(this.repo, parsed.eventId, (row) => {
      return Event.restore(row.snapshot)
        .setAvailabilityMeta({
          userId: parsed.userId,
          note: parsed.note,
          chosenDay: parsed.chosenDay,
        })
        .toSnapshot()
    })
    return { event: saved.snapshot, version: saved.version }
  }
}
