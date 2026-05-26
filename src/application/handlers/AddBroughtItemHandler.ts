import { AddBroughtItemSchema, type AddBroughtItemInput } from '@/application/dtos/AddBroughtItemDTO'
import { type EventSnapshot } from '@/domain/entities/Event'
import { Purchase } from '@/domain/entities/Purchase'
import { HistoryAppender } from '@/domain/services/HistoryAppender'
import { type IEventRepository, VersionConflictError } from '@/domain/repositories/IEventRepository'

export interface AddBroughtItemResult {
  event: EventSnapshot
  version: number
}

const MAX_RETRIES = 3

export class AddBroughtItemHandler {
  constructor(private readonly repo: IEventRepository) {}

  async execute(input: AddBroughtItemInput): Promise<AddBroughtItemResult> {
    const parsed = AddBroughtItemSchema.parse(input)

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const row = await this.repo.findById(parsed.eventId)
      if (!row) throw new Error('Event not found')

      const knownIds = new Set(row.snapshot.users.map((u) => u.id))
      if (!knownIds.has(parsed.createdBy))
        throw new Error(`createdBy ${parsed.createdBy} not in event`)
      if (parsed.broughtBy != null && !knownIds.has(parsed.broughtBy))
        throw new Error(`broughtBy ${parsed.broughtBy} not in event`)

      const created = Purchase.createBring({
        createdBy: parsed.createdBy,
        item: parsed.item,
        quantity: parsed.quantity,
        unit: parsed.unit,
        group: parsed.group ?? null,
        broughtBy: parsed.broughtBy ?? null,
      })

      const creatorName =
        row.snapshot.users.find((u) => u.id === parsed.createdBy)?.name ?? 'Someone'
      const nextSnapshot: EventSnapshot = HistoryAppender.append(
        {
          ...row.snapshot,
          purchases: [...row.snapshot.purchases, created.toSnapshot()],
        },
        {
          type: 'purchase_added',
          userId: parsed.createdBy,
          description: `${creatorName} added ${created.toSnapshot().item} (from home)`,
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
