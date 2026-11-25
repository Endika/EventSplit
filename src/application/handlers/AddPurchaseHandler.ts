import { AddPurchaseSchema, type AddPurchaseInput } from '@/application/dtos/AddPurchaseDTO'
import { type EventSnapshot } from '@/domain/entities/Event'
import { Purchase } from '@/domain/entities/Purchase'
import { HistoryAppender } from '@/domain/services/HistoryAppender'
import type { IEventRepository } from '@/domain/repositories/IEventRepository'
import { withOptimisticRetry } from '@/application/support/withOptimisticRetry'
import { assertMember, memberName } from '@/application/support/eventMembers'

export interface AddPurchaseResult {
  event: EventSnapshot
  version: number
}

export class AddPurchaseHandler {
  constructor(private readonly repo: IEventRepository) {}

  async execute(input: AddPurchaseInput): Promise<AddPurchaseResult> {
    const parsed = AddPurchaseSchema.parse(input)

    const saved = await withOptimisticRetry(this.repo, parsed.eventId, (row) => {
      for (const c of parsed.consumers) {
        assertMember(row.snapshot, c.userId, 'Consumer')
      }
      assertMember(row.snapshot, parsed.createdBy, 'createdBy')

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
        subgroup: parsed.subgroup ?? null,
      })

      const creatorDisplay = memberName(row.snapshot, parsed.createdBy)
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
