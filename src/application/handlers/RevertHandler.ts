import { RevertSchema, type RevertInput } from '@/application/dtos/RevertDTO'
import type { EventSnapshot } from '@/domain/entities/Event'
import { HistoryAppender } from '@/domain/services/HistoryAppender'
import { type IEventRepository, VersionConflictError } from '@/domain/repositories/IEventRepository'

const MAX_RETRIES = 3

export class RevertHandler {
  constructor(private readonly repo: IEventRepository) {}

  async execute(input: RevertInput): Promise<{ event: EventSnapshot; version: number }> {
    const parsed = RevertSchema.parse(input)
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const row = await this.repo.findById(parsed.eventId)
      if (!row) throw new Error('Event not found')

      const target = row.snapshot.history.find((h) => h.version === parsed.targetVersion)
      if (!target) throw new Error(`Version ${parsed.targetVersion} not found in history`)
      if (!target.fullState)
        throw new Error('Cannot revert: this history entry has no snapshot (legacy event)')

      if (!row.snapshot.users.some((u) => u.id === parsed.userId))
        throw new Error(`User ${parsed.userId} not in event`)

      const restored: EventSnapshot = {
        ...(target.fullState as Omit<EventSnapshot, 'history'>),
        history: row.snapshot.history,
      }
      const userName = row.snapshot.users.find((u) => u.id === parsed.userId)?.name ?? 'Someone'
      const next = HistoryAppender.append(restored, {
        type: 'revert',
        userId: parsed.userId,
        description: `${userName} reverted to v${parsed.targetVersion}`,
        before: { version: row.snapshot.history.at(-1)?.version ?? 0 },
        after: { version: parsed.targetVersion },
      })

      try {
        const saved = await this.repo.update(parsed.eventId, next, row.version)
        return { event: saved.snapshot, version: saved.version }
      } catch (err) {
        if (!(err instanceof VersionConflictError)) throw err
      }
    }
    throw new Error('Could not save: too many concurrent writes')
  }
}
