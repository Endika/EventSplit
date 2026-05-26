import { SetAvailabilitySchema, type SetAvailabilityInput } from '@/application/dtos/SetAvailabilityDTO'
import type { EventSnapshot } from '@/domain/entities/Event'
import { HistoryAppender } from '@/domain/services/HistoryAppender'
import { type IEventRepository, VersionConflictError } from '@/domain/repositories/IEventRepository'

const MAX_RETRIES = 3

export class SetAvailabilityHandler {
  constructor(private readonly repo: IEventRepository) {}

  async execute(input: SetAvailabilityInput): Promise<{ event: EventSnapshot; version: number }> {
    const parsed = SetAvailabilitySchema.parse(input)
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const row = await this.repo.findById(parsed.eventId)
      if (!row) throw new Error('Event not found')

      const user = row.snapshot.users.find((u) => u.id === parsed.userId)
      if (!user) throw new Error(`User ${parsed.userId} not in event`)

      if (parsed.votes.length !== row.snapshot.days.length)
        throw new Error(
          `votes length (${parsed.votes.length}) must match days length (${row.snapshot.days.length})`,
        )

      const nextAvailability = { ...row.snapshot.availability, [parsed.userId]: parsed.votes }
      const before = row.snapshot.availability[parsed.userId] ?? null

      const nextSnapshot: EventSnapshot = HistoryAppender.append(
        { ...row.snapshot, availability: nextAvailability },
        {
          type: 'availability_voted',
          userId: parsed.userId,
          description: `${user.name} voted availability`,
          before,
          after: parsed.votes,
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
