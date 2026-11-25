import {
  SetAvailabilityBatchSchema,
  type SetAvailabilityBatchInput,
} from '@/application/dtos/SetAvailabilityBatchDTO'
import type { EventSnapshot } from '@/domain/entities/Event'
import { HistoryAppender } from '@/domain/services/HistoryAppender'
import type { IEventRepository } from '@/domain/repositories/IEventRepository'
import { withOptimisticRetry } from '@/application/support/withOptimisticRetry'
import { assertMember, memberName } from '@/application/support/eventMembers'

export class SetAvailabilityBatchHandler {
  constructor(private readonly repo: IEventRepository) {}

  async execute(
    input: SetAvailabilityBatchInput,
  ): Promise<{ event: EventSnapshot; version: number }> {
    const parsed = SetAvailabilityBatchSchema.parse(input)

    const saved = await withOptimisticRetry(this.repo, parsed.eventId, (row) => {
      assertMember(row.snapshot, parsed.editedBy, 'editedBy')

      const dayCount = row.snapshot.dayOptions.length
      const nextAvailability = { ...row.snapshot.availability }
      for (const [userId, votes] of Object.entries(parsed.votes)) {
        assertMember(row.snapshot, userId, 'User')
        if (votes.length !== dayCount)
          throw new Error(
            `votes for ${userId} length (${votes.length}) must match option count (${dayCount})`,
          )
        nextAvailability[userId] = votes
      }

      const editorName = memberName(row.snapshot, parsed.editedBy)
      const changedCount = Object.keys(parsed.votes).length
      const nextSnapshot: EventSnapshot = HistoryAppender.append(
        { ...row.snapshot, availability: nextAvailability },
        {
          type: 'availability_voted',
          userId: parsed.editedBy,
          description: `${editorName} updated availability for ${changedCount} ${
            changedCount === 1 ? 'person' : 'people'
          }`,
        },
      )

      return nextSnapshot
    })
    return { event: saved.snapshot, version: saved.version }
  }
}
