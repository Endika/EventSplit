import { SetEventStageSchema, type SetEventStageInput } from '@/application/dtos/SetEventStageDTO'
import { Event, type EventSnapshot } from '@/domain/entities/Event'
import { type IEventRepository, VersionConflictError } from '@/domain/repositories/IEventRepository'

const MAX_RETRIES = 3

export class SetEventStageHandler {
  constructor(private readonly repo: IEventRepository) {}

  async execute(input: SetEventStageInput): Promise<{ event: EventSnapshot; version: number }> {
    const parsed = SetEventStageSchema.parse(input)
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const row = await this.repo.findById(parsed.eventId)
      if (!row) throw new Error('Event not found')
      const next = Event.restore(row.snapshot).setStage({
        stage: parsed.stage,
        userId: parsed.userId,
      })
      const nextSnapshot = next.toSnapshot()
      // If snapshot is identical (no-op), skip the update
      if (nextSnapshot.stage === row.snapshot.stage) {
        return { event: row.snapshot, version: row.version }
      }
      try {
        const saved = await this.repo.update(parsed.eventId, nextSnapshot, row.version, null)
        return { event: saved.snapshot, version: saved.version }
      } catch (err) {
        if (!(err instanceof VersionConflictError)) throw err
      }
    }
    throw new Error('Could not save: too many concurrent writes')
  }
}
