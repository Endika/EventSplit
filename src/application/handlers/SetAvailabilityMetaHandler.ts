import { SetAvailabilityMetaSchema, type SetAvailabilityMetaInput } from '@/application/dtos/SetAvailabilityMetaDTO'
import { Event, type EventSnapshot } from '@/domain/entities/Event'
import { type IEventRepository, VersionConflictError } from '@/domain/repositories/IEventRepository'

const MAX_RETRIES = 3

export class SetAvailabilityMetaHandler {
  constructor(private readonly repo: IEventRepository) {}

  async execute(input: SetAvailabilityMetaInput): Promise<{ event: EventSnapshot; version: number }> {
    const parsed = SetAvailabilityMetaSchema.parse(input)
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const row = await this.repo.findById(parsed.eventId)
      if (!row) throw new Error('Event not found')
      const next = Event.restore(row.snapshot).setAvailabilityMeta({
        userId: parsed.userId,
        note: parsed.note,
        chosenDay: parsed.chosenDay,
      })
      try {
        const saved = await this.repo.update(parsed.eventId, next.toSnapshot(), row.version)
        return { event: saved.snapshot, version: saved.version }
      } catch (err) {
        if (!(err instanceof VersionConflictError)) throw err
      }
    }
    throw new Error('Could not save: too many concurrent writes')
  }
}
