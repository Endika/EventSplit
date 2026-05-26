import {
  RenameGroupSchema,
  type RenameGroupInput,
} from '@/application/dtos/RenameGroupDTO'
import { Event, type EventSnapshot } from '@/domain/entities/Event'
import { type IEventRepository, VersionConflictError } from '@/domain/repositories/IEventRepository'

const MAX_RETRIES = 3

export class RenameGroupHandler {
  constructor(private readonly repo: IEventRepository) {}

  async execute(input: RenameGroupInput): Promise<{ event: EventSnapshot; version: number }> {
    const parsed = RenameGroupSchema.parse(input)
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const row = await this.repo.findById(parsed.eventId)
      if (!row) throw new Error('Event not found')
      const next = Event.restore(row.snapshot).renameGroup({
        userId: parsed.userId,
        from: parsed.from,
        to: parsed.to,
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
