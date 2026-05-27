import { SetEventDaysSchema, type SetEventDaysInput } from '@/application/dtos/SetEventDaysDTO'
import type { EventSnapshot } from '@/domain/entities/Event'
import { HistoryAppender } from '@/domain/services/HistoryAppender'
import type { IEventRepository } from '@/domain/repositories/IEventRepository'
import { withOptimisticRetry } from '@/application/support/withOptimisticRetry'

export class SetEventDaysHandler {
  constructor(private readonly repo: IEventRepository) {}

  async execute(input: SetEventDaysInput): Promise<{ event: EventSnapshot; version: number }> {
    const parsed = SetEventDaysSchema.parse(input)
    const saved = await withOptimisticRetry(this.repo, parsed.eventId, (row) => {
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

      return nextSnapshot
    })
    return { event: saved.snapshot, version: saved.version }
  }
}
