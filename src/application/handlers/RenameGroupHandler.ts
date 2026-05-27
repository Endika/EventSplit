import { RenameGroupSchema, type RenameGroupInput } from '@/application/dtos/RenameGroupDTO'
import { Event, type EventSnapshot } from '@/domain/entities/Event'
import type { IEventRepository } from '@/domain/repositories/IEventRepository'
import { withOptimisticRetry } from '@/application/support/withOptimisticRetry'

export class RenameGroupHandler {
  constructor(private readonly repo: IEventRepository) {}

  async execute(input: RenameGroupInput): Promise<{ event: EventSnapshot; version: number }> {
    const parsed = RenameGroupSchema.parse(input)
    const saved = await withOptimisticRetry(this.repo, parsed.eventId, (row) => {
      return Event.restore(row.snapshot)
        .renameGroup({
          userId: parsed.userId,
          from: parsed.from,
          to: parsed.to,
        })
        .toSnapshot()
    })
    return { event: saved.snapshot, version: saved.version }
  }
}
