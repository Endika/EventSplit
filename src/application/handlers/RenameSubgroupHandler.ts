import {
  RenameSubgroupSchema,
  type RenameSubgroupInput,
} from '@/application/dtos/RenameSubgroupDTO'
import { Event, type EventSnapshot } from '@/domain/entities/Event'
import type { IEventRepository } from '@/domain/repositories/IEventRepository'
import { withOptimisticRetry } from '@/application/support/withOptimisticRetry'

export class RenameSubgroupHandler {
  constructor(private readonly repo: IEventRepository) {}

  async execute(input: RenameSubgroupInput): Promise<{ event: EventSnapshot; version: number }> {
    const parsed = RenameSubgroupSchema.parse(input)
    const saved = await withOptimisticRetry(this.repo, parsed.eventId, (row) => {
      return Event.restore(row.snapshot)
        .renameSubgroup({
          userId: parsed.userId,
          group: parsed.group,
          from: parsed.from,
          to: parsed.to,
        })
        .toSnapshot()
    })
    return { event: saved.snapshot, version: saved.version }
  }
}
