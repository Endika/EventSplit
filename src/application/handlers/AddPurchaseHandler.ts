import { AddPurchaseSchema, type AddPurchaseInput } from '@/application/dtos/AddPurchaseDTO'
import { type EventSnapshot } from '@/domain/entities/Event'
import { Purchase } from '@/domain/entities/Purchase'
import { HistoryAppender } from '@/domain/services/HistoryAppender'
import { type IEventRepository, VersionConflictError } from '@/domain/repositories/IEventRepository'

export interface AddPurchaseResult {
  event: EventSnapshot
  version: number
}

const MAX_RETRIES = 3

export class AddPurchaseHandler {
  constructor(private readonly repo: IEventRepository) {}

  async execute(input: AddPurchaseInput): Promise<AddPurchaseResult> {
    const parsed = AddPurchaseSchema.parse(input)

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const row = await this.repo.findById(parsed.eventId)
      if (!row) throw new Error('Event not found')

      const knownIds = new Set(row.snapshot.users.map((u) => u.id))
      for (const c of parsed.consumers) {
        if (!knownIds.has(c.userId)) throw new Error(`Consumer ${c.userId} not in event`)
      }
      if (!knownIds.has(parsed.createdBy))
        throw new Error(`createdBy ${parsed.createdBy} not in event`)

      const purchase = Purchase.create({
        createdBy: parsed.createdBy,
        item: parsed.item,
        quantity: parsed.quantity,
        unit: parsed.unit,
        dailyConsumption: parsed.dailyConsumption,
        consumers: parsed.consumers,
        days: parsed.days,
        assignedTo: parsed.assignedTo ?? null,
        group: parsed.group ?? null,
      })

      const creatorDisplay =
        row.snapshot.users.find((u) => u.id === parsed.createdBy)?.name ?? 'Someone'
      const nextSnapshot: EventSnapshot = HistoryAppender.append(
        {
          ...row.snapshot,
          purchases: [...row.snapshot.purchases, purchase.toSnapshot()],
        },
        {
          type: 'purchase_added',
          userId: parsed.createdBy,
          description: `${creatorDisplay} added ${purchase.toSnapshot().item}`,
          before: null,
          after: { purchaseId: purchase.id, item: purchase.toSnapshot().item },
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
