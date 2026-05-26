import {
  SetAvailabilityBatchSchema,
  type SetAvailabilityBatchInput,
} from '@/application/dtos/SetAvailabilityBatchDTO'
import type { EventSnapshot } from '@/domain/entities/Event'
import { HistoryAppender } from '@/domain/services/HistoryAppender'
import { type IEventRepository, VersionConflictError } from '@/domain/repositories/IEventRepository'

const MAX_RETRIES = 3

export class SetAvailabilityBatchHandler {
  constructor(private readonly repo: IEventRepository) {}

  async execute(input: SetAvailabilityBatchInput): Promise<{ event: EventSnapshot; version: number }> {
    const parsed = SetAvailabilityBatchSchema.parse(input)

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const row = await this.repo.findById(parsed.eventId)
      if (!row) throw new Error('Event not found')

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

      try {
        const saved = await this.repo.update(parsed.eventId, nextSnapshot, row.version)
        return { event: saved.snapshot, version: saved.version }
      } catch (err) {
        if (!(err instanceof VersionConflictError)) throw err
      }
    }
    throw new Error('Could not save: too many concurrent writes')
  }
}
