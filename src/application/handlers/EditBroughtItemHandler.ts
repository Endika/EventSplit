import {
  EditBroughtItemSchema,
  type EditBroughtItemInput,
} from '@/application/dtos/EditBroughtItemDTO'
import type { EventSnapshot } from '@/domain/entities/Event'
import { Purchase } from '@/domain/entities/Purchase'
import { HistoryAppender } from '@/domain/services/HistoryAppender'
import { pruneGroupOrder, pruneSubgroupOrder } from '@/domain/services/pruneGroupOrder'
import type { IEventRepository } from '@/domain/repositories/IEventRepository'
import { withOptimisticRetry } from '@/application/support/withOptimisticRetry'
import {
  assertMember,
  memberName,
  requireById,
  replaceById,
} from '@/application/support/snapshotLookups'

export class EditBroughtItemHandler {
  constructor(private readonly repo: IEventRepository) {}

  async execute(input: EditBroughtItemInput): Promise<{ event: EventSnapshot; version: number }> {
    const parsed = EditBroughtItemSchema.parse(input)

    const saved = await withOptimisticRetry(this.repo, parsed.eventId, (row) => {
      assertMember(row.snapshot, parsed.editedBy, 'editedBy')
      if (parsed.broughtBy != null) assertMember(row.snapshot, parsed.broughtBy, 'broughtBy')

      const existing = requireById(row.snapshot.purchases, parsed.purchaseId, 'Purchase')
      if (existing.deleted) throw new Error('Cannot edit a deleted purchase')

      const updated = Purchase.restore(existing).editBring({
        item: parsed.item,
        quantity: parsed.quantity,
        unit: parsed.unit,
        group: parsed.group ?? null,
        subgroup: parsed.subgroup ?? null,
        broughtBy: parsed.broughtBy ?? null,
      })

      const editorName = memberName(row.snapshot, parsed.editedBy)
      const newPurchases = replaceById(
        row.snapshot.purchases,
        parsed.purchaseId,
        updated.toSnapshot(),
      )
      const nextSnapshot: EventSnapshot = HistoryAppender.append(
        {
          ...row.snapshot,
          purchases: newPurchases,
          groupOrder: pruneGroupOrder(newPurchases, row.snapshot.groupOrder),
          subgroupOrder: pruneSubgroupOrder(newPurchases, row.snapshot.subgroupOrder),
        },
        {
          type: 'purchase_edited',
          userId: parsed.editedBy,
          description: `${editorName} edited ${existing.item}`,
        },
      )

      return nextSnapshot
    })
    return { event: saved.snapshot, version: saved.version }
  }
}
