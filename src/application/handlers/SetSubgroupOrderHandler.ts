import {
  SetSubgroupOrderSchema,
  type SetSubgroupOrderInput,
} from '@/application/dtos/SetSubgroupOrderDTO'
import { Event, type EventSnapshot } from '@/domain/entities/Event'
import type { IEventRepository } from '@/domain/repositories/IEventRepository'
import { withOptimisticRetry } from '@/application/support/withOptimisticRetry'

export class SetSubgroupOrderHandler {
  constructor(private readonly repo: IEventRepository) {}

  async execute(input: SetSubgroupOrderInput): Promise<{ event: EventSnapshot; version: number }> {
    const parsed = SetSubgroupOrderSchema.parse(input)
    const saved = await withOptimisticRetry(this.repo, parsed.eventId, (row) => {
      return Event.restore(row.snapshot)
        .setSubgroupOrder({
          userId: parsed.userId,
          group: parsed.group,
          order: parsed.order,
        })
        .toSnapshot()
    })
    return { event: saved.snapshot, version: saved.version }
  }
}
