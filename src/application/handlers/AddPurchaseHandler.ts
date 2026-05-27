import { AddPurchaseSchema, type AddPurchaseInput } from '@/application/dtos/AddPurchaseDTO'
import { type EventSnapshot } from '@/domain/entities/Event'
import { Purchase } from '@/domain/entities/Purchase'
import { HistoryAppender } from '@/domain/services/HistoryAppender'
import type { IEventRepository } from '@/domain/repositories/IEventRepository'
import { withOptimisticRetry } from '@/application/support/withOptimisticRetry'

export interface AddPurchaseResult {
  event: EventSnapshot
  version: number
}

export class AddPurchaseHandler {
  constructor(private readonly repo: IEventRepository) {}

  async execute(input: AddPurchaseInput): Promise<AddPurchaseResult> {
    const parsed = AddPurchaseSchema.parse(input)

    const saved = await withOptimisticRetry(this.repo, parsed.eventId, (row) => {
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
        },
      )

      return nextSnapshot
    })
    return { event: saved.snapshot, version: saved.version }
  }
}
