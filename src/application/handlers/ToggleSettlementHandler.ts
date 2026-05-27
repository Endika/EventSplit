import {
  ToggleSettlementSchema,
  type ToggleSettlementInput,
} from '@/application/dtos/ToggleSettlementDTO'
import { Event, type EventSnapshot } from '@/domain/entities/Event'
import type { IEventRepository } from '@/domain/repositories/IEventRepository'
import { withOptimisticRetry } from '@/application/support/withOptimisticRetry'

export class ToggleSettlementHandler {
  constructor(private readonly repo: IEventRepository) {}

  async execute(input: ToggleSettlementInput): Promise<{ event: EventSnapshot; version: number }> {
    const parsed = ToggleSettlementSchema.parse(input)
    const saved = await withOptimisticRetry(this.repo, parsed.eventId, (row) => {
      return Event.restore(row.snapshot)
        .toggleSettlement({
          userId: parsed.userId,
          from: parsed.from,
          to: parsed.to,
        })
        .toSnapshot()
    })
    return { event: saved.snapshot, version: saved.version }
  }
}
