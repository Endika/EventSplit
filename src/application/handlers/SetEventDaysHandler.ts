import { SetEventDaysSchema, type SetEventDaysInput } from '@/application/dtos/SetEventDaysDTO'
import type { EventSnapshot } from '@/domain/entities/Event'
import { HistoryAppender } from '@/domain/services/HistoryAppender'
import { type IEventRepository, VersionConflictError } from '@/domain/repositories/IEventRepository'

const MAX_RETRIES = 3

export class SetEventDaysHandler {
  constructor(private readonly repo: IEventRepository) {}

  async execute(input: SetEventDaysInput): Promise<{ event: EventSnapshot; version: number }> {
    const parsed = SetEventDaysSchema.parse(input)
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const row = await this.repo.findById(parsed.eventId)
      if (!row) throw new Error('Event not found')

      // Truncate/extend each user's availability array to match new days length
      const newLen = parsed.days.length
      const oldDays = row.snapshot.days
      const newAvailability: Record<string, boolean[]> = {}
      for (const [userId, votes] of Object.entries(row.snapshot.availability)) {
        if (votes.length === newLen) {
          newAvailability[userId] = votes
          continue
        }
        // Try to align by date when possible
        const aligned: boolean[] = parsed.days.map((d) => {
          const idx = oldDays.indexOf(d)
          return idx >= 0 ? votes[idx] ?? false : false
        })
        newAvailability[userId] = aligned
      }

      const nextSnapshot: EventSnapshot = HistoryAppender.append(
        { ...row.snapshot, days: parsed.days, availability: newAvailability },
        {
          type: 'days_set',
          userId: row.snapshot.createdBy,
          description: `Event days set: ${parsed.days.join(', ')}`,
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
