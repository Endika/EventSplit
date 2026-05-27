import {
  SetGroupOrderSchema,
  type SetGroupOrderInput,
} from '@/application/dtos/SetGroupOrderDTO'
import { Event, type EventSnapshot } from '@/domain/entities/Event'
import type { IEventRepository } from '@/domain/repositories/IEventRepository'
import { withOptimisticRetry } from '@/application/support/withOptimisticRetry'

export class SetGroupOrderHandler {
  constructor(private readonly repo: IEventRepository) {}

  async execute(input: SetGroupOrderInput): Promise<{ event: EventSnapshot; version: number }> {
    const parsed = SetGroupOrderSchema.parse(input)
    const saved = await withOptimisticRetry(this.repo, parsed.eventId, (row) => {
      return Event.restore(row.snapshot)
        .setGroupOrder({
          userId: parsed.userId,
          order: parsed.order,
        })
        .toSnapshot()
    })
    return { event: saved.snapshot, version: saved.version }
  }
}
