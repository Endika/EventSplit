import {
  SetAvailabilityBatchSchema,
  type SetAvailabilityBatchInput,
} from '@/application/dtos/SetAvailabilityBatchDTO'
import type { EventSnapshot } from '@/domain/entities/Event'
import { HistoryAppender } from '@/domain/services/HistoryAppender'
import type { IEventRepository } from '@/domain/repositories/IEventRepository'
import { withOptimisticRetry } from '@/application/support/withOptimisticRetry'

export class SetAvailabilityBatchHandler {
  constructor(private readonly repo: IEventRepository) {}

  async execute(
    input: SetAvailabilityBatchInput,
  ): Promise<{ event: EventSnapshot; version: number }> {
    const parsed = SetAvailabilityBatchSchema.parse(input)

    const saved = await withOptimisticRetry(this.repo, parsed.eventId, (row) => {
      const knownIds = new Set(row.snapshot.users.map((u) => u.id))
      if (!knownIds.has(parsed.editedBy))
        throw new Error(`editedBy ${parsed.editedBy} not in event`)

      const dayCount = row.snapshot.days.length
      const nextAvailability = { ...row.snapshot.availability }
      for (const [userId, votes] of Object.entries(parsed.votes)) {
        if (!knownIds.has(userId)) throw new Error(`User ${userId} not in event`)
        if (votes.length !== dayCount)
          throw new Error(
            `votes for ${userId} length (${votes.length}) must match days length (${dayCount})`,
          )
        nextAvailability[userId] = votes
      }

      const editorName = row.snapshot.users.find((u) => u.id === parsed.editedBy)?.name ?? 'Someone'
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
