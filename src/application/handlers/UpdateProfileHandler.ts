import { UpdateProfileSchema, type UpdateProfileInput } from '@/application/dtos/UpdateProfileDTO'
import { type EventSnapshot } from '@/domain/entities/Event'
import { User } from '@/domain/entities/User'
import { HistoryAppender } from '@/domain/services/HistoryAppender'
import { type IEventRepository, VersionConflictError } from '@/domain/repositories/IEventRepository'

const MAX_RETRIES = 3

export class UpdateProfileHandler {
  constructor(private readonly repo: IEventRepository) {}

  async execute(input: UpdateProfileInput): Promise<{ event: EventSnapshot; version: number }> {
    const parsed = UpdateProfileSchema.parse(input)
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const row = await this.repo.findById(parsed.eventId)
      if (!row) throw new Error('Event not found')

      const existing = row.snapshot.users.find((u) => u.id === parsed.userId)
      if (!existing) throw new Error(`User ${parsed.userId} not in event`)

      const updated = User.restore(existing).withProfile({
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

      const nextUsers = row.snapshot.users.map((u) => (u.id === parsed.userId ? updated.toSnapshot() : u))
      const nextSnapshot: EventSnapshot = HistoryAppender.append(
        { ...row.snapshot, users: nextUsers },
        {
          type: 'user_profile_updated',
          userId: parsed.userId,
          description: `${updated.displayName} updated their profile`,
          before: existing,
          after: updated.toSnapshot(),
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
