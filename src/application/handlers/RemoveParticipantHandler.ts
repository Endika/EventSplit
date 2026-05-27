import {
  RemoveParticipantSchema,
  type RemoveParticipantInput,
} from '@/application/dtos/RemoveParticipantDTO'
import { Event, type EventSnapshot } from '@/domain/entities/Event'
import type { IEventRepository } from '@/domain/repositories/IEventRepository'
import { withOptimisticRetry } from '@/application/support/withOptimisticRetry'

export class RemoveParticipantHandler {
  constructor(private readonly repo: IEventRepository) {}

  async execute(input: RemoveParticipantInput): Promise<{ event: EventSnapshot; version: number }> {
    const parsed = RemoveParticipantSchema.parse(input)
    const saved = await withOptimisticRetry(this.repo, parsed.eventId, (row) => {
      return Event.restore(row.snapshot).removeUser(parsed.userId).toSnapshot()
    })
    return { event: saved.snapshot, version: saved.version }
  }
}
