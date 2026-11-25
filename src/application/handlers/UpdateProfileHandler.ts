import { UpdateProfileSchema, type UpdateProfileInput } from '@/application/dtos/UpdateProfileDTO'
import { type EventSnapshot } from '@/domain/entities/Event'
import { User } from '@/domain/entities/User'
import { HistoryAppender } from '@/domain/services/HistoryAppender'
import { canBecome, hasDependants } from '@/domain/services/participantRoles'
import { assertGuardianIsAnAdultOfTheEvent } from '@/application/support/assertGuardian'
import type { IEventRepository } from '@/domain/repositories/IEventRepository'
import { withOptimisticRetry } from '@/application/support/withOptimisticRetry'
import { memberName, replaceById } from '@/application/support/snapshotLookups'

export class UpdateProfileHandler {
  constructor(private readonly repo: IEventRepository) {}

  async execute(input: UpdateProfileInput): Promise<{ event: EventSnapshot; version: number }> {
    const parsed = UpdateProfileSchema.parse(input)
    const saved = await withOptimisticRetry(this.repo, parsed.eventId, (row) => {
      const existing = row.snapshot.users.find((u) => u.id === parsed.userId)
      if (!existing) throw new Error(`User ${parsed.userId} not in event`)
      if (
        // Stryker disable next-line ConditionalExpression: an undefined kind is not 'dog', so canBecome is true anyway
        parsed.kind !== undefined &&
        !canBecome(parsed.kind, { expenses: row.snapshot.expenses, userId: parsed.userId })
      ) {
        throw new Error('This participant has paid for something and cannot become a dog')
      }

      // Turning an adult into anything else would strand the children pointing
      // at them, so it is refused before the change is applied.
      if (
        parsed.kind !== undefined &&
        parsed.kind !== 'adult' &&
        hasDependants(parsed.userId, row.snapshot.users)
      ) {
        throw new Error('This adult has children in their charge and must stay an adult')
      }

      const updated = User.restore(existing).withProfile({
        name: parsed.name,
        alias: parsed.alias,
        email: parsed.email,
        phone: parsed.phone,
        dietary: parsed.dietary,
        notes: parsed.notes,
        kind: parsed.kind,
        guardianId: parsed.guardianId,
        household: parsed.household,
        allergies: parsed.allergies?.map((a) => ({
          name: a.name,
          severity: a.severity,
          notes: a.notes ?? null,
        })),
      })

      assertGuardianIsAnAdultOfTheEvent(updated.guardianId, row.snapshot.users)

      const nextUsers = replaceById(row.snapshot.users, parsed.userId, updated.toSnapshot())
      const actorName = memberName(row.snapshot, parsed.actorId)
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
