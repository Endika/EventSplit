import { UpdateProfileSchema, type UpdateProfileInput } from '@/application/dtos/UpdateProfileDTO'
import { type EventSnapshot } from '@/domain/entities/Event'
import { User } from '@/domain/entities/User'
import { HistoryAppender } from '@/domain/services/HistoryAppender'
import type { IEventRepository } from '@/domain/repositories/IEventRepository'
import { withOptimisticRetry } from '@/application/support/withOptimisticRetry'

export class UpdateProfileHandler {
  constructor(private readonly repo: IEventRepository) {}

  async execute(input: UpdateProfileInput): Promise<{ event: EventSnapshot; version: number }> {
    const parsed = UpdateProfileSchema.parse(input)
    const saved = await withOptimisticRetry(this.repo, parsed.eventId, (row) => {
      const existing = row.snapshot.users.find((u) => u.id === parsed.userId)
      if (!existing) throw new Error(`User ${parsed.userId} not in event`)

      const updated = User.restore(existing).withProfile({
        name: parsed.name,
        alias: parsed.alias,
        email: parsed.email,
        phone: parsed.phone,
        dietary: parsed.dietary,
        notes: parsed.notes,
        kind: parsed.kind,
        allergies: parsed.allergies?.map((a) => ({
          name: a.name,
          severity: a.severity,
          notes: a.notes ?? null,
        })),
      })

      const nextUsers = row.snapshot.users.map((u) =>
        u.id === parsed.userId ? updated.toSnapshot() : u,
      )
      const actorName = row.snapshot.users.find((u) => u.id === parsed.actorId)?.name ?? 'Someone'
      const description =
        parsed.actorId === parsed.userId
          ? `${updated.displayName} updated their profile`
          : `${actorName} updated ${updated.displayName}'s profile`
      const nextSnapshot: EventSnapshot = HistoryAppender.append(
        { ...row.snapshot, users: nextUsers },
        {
          type: 'user_profile_updated',
          userId: parsed.actorId,
          description,
        },
      )

      return nextSnapshot
    })
    return { event: saved.snapshot, version: saved.version }
  }
}
