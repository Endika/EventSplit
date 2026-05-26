import { SetEditPinSchema, type SetEditPinInput } from '@/application/dtos/SetEditPinDTO'
import type { EventSnapshot } from '@/domain/entities/Event'
import { EditPin } from '@/domain/value-objects/EditPin'
import { HistoryAppender } from '@/domain/services/HistoryAppender'
import { type IEventRepository, VersionConflictError } from '@/domain/repositories/IEventRepository'

const MAX_RETRIES = 3

export class SetEditPinHandler {
  constructor(private readonly repo: IEventRepository) {}

  async execute(input: SetEditPinInput): Promise<{ event: EventSnapshot; version: number }> {
    const parsed = SetEditPinSchema.parse(input)
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const row = await this.repo.findById(parsed.eventId)
      if (!row) throw new Error('Event not found')
      if (!row.snapshot.users.some((u) => u.id === parsed.userId))
        throw new Error(`User ${parsed.userId} not in event`)

      const newHash = parsed.pin === null ? null : await EditPin.hash(parsed.pin, parsed.eventId)
      const userName = row.snapshot.users.find((u) => u.id === parsed.userId)?.name ?? 'Someone'

      const next = HistoryAppender.append(
        { ...row.snapshot, editPin: newHash },
        {
          type: parsed.pin === null ? 'edit_pin_cleared' : 'edit_pin_set',
          userId: parsed.userId,
          description:
            parsed.pin === null
              ? `${userName} removed the edit PIN`
              : `${userName} set an edit PIN`,
          before: { hadPin: !!row.snapshot.editPin },
          after: { hasPin: parsed.pin !== null },
        },
      )

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
