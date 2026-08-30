import { SetDayOptionsSchema, type SetDayOptionsInput } from '@/application/dtos/SetDayOptionsDTO'
import type { EventSnapshot } from '@/domain/entities/Event'
import { HistoryAppender } from '@/domain/services/HistoryAppender'
import type { IEventRepository } from '@/domain/repositories/IEventRepository'
import { withOptimisticRetry } from '@/application/support/withOptimisticRetry'
import { optionKey, sortOptions } from '@/domain/value-objects/DayOption'

export class SetDayOptionsHandler {
  constructor(private readonly repo: IEventRepository) {}

  async execute(input: SetDayOptionsInput): Promise<{ event: EventSnapshot; version: number }> {
    const parsed = SetDayOptionsSchema.parse(input)
    const options = sortOptions(parsed.options)

    const saved = await withOptimisticRetry(this.repo, parsed.eventId, (row) => {
      const oldKeys = row.snapshot.dayOptions.map(optionKey)
      const newAvailability: Record<string, boolean[]> = {}
      for (const [userId, votes] of Object.entries(row.snapshot.availability)) {
        // Realign by key: a surviving option keeps its vote, a new one starts
        // false, and one that goes takes its column with it.
        newAvailability[userId] = options.map((o) => {
          const idx = oldKeys.indexOf(optionKey(o))
          return idx >= 0 ? (votes[idx] ?? false) : false
        })
      }

      const keys = new Set(options.map(optionKey))
      const nextSnapshot: EventSnapshot = HistoryAppender.append(
        {
          ...row.snapshot,
          dayOptions: options,
          availability: newAvailability,
          // Drop chosen options that are no longer on offer, otherwise they
          // dangle and later availability writes reject them.
          chosenOptions: row.snapshot.chosenOptions.filter((k) => keys.has(k)),
        },
        {
          type: 'days_set',
          userId: row.snapshot.createdBy,
          description: `Event day options set: ${options.map(optionKey).join(', ')}`,
        },
      )

      return nextSnapshot
    })
    return { event: saved.snapshot, version: saved.version }
  }
}
