import {
  AddBroughtItemSchema,
  type AddBroughtItemInput,
} from '@/application/dtos/AddBroughtItemDTO'
import { type EventSnapshot } from '@/domain/entities/Event'
import { Purchase } from '@/domain/entities/Purchase'
import { HistoryAppender } from '@/domain/services/HistoryAppender'
import type { IEventRepository } from '@/domain/repositories/IEventRepository'
import { withOptimisticRetry } from '@/application/support/withOptimisticRetry'
import { assertMember, memberName } from '@/application/support/eventMembers'

export interface AddBroughtItemResult {
  event: EventSnapshot
  version: number
}

export class AddBroughtItemHandler {
  constructor(private readonly repo: IEventRepository) {}

  async execute(input: AddBroughtItemInput): Promise<AddBroughtItemResult> {
    const parsed = AddBroughtItemSchema.parse(input)

    const saved = await withOptimisticRetry(this.repo, parsed.eventId, (row) => {
      assertMember(row.snapshot, parsed.createdBy, 'createdBy')
      if (parsed.broughtBy != null) assertMember(row.snapshot, parsed.broughtBy, 'broughtBy')

      const created = Purchase.createBring({
        createdBy: parsed.createdBy,
        item: parsed.item,
        quantity: parsed.quantity,
        unit: parsed.unit,
        group: parsed.group ?? null,
        subgroup: parsed.subgroup ?? null,
        broughtBy: parsed.broughtBy ?? null,
      })

      const creatorName = memberName(row.snapshot, parsed.createdBy)
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

      return nextSnapshot
    })
    return { event: saved.snapshot, version: saved.version }
  }
}
