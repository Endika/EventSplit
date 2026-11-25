import { EditPurchaseSchema, type EditPurchaseInput } from '@/application/dtos/EditPurchaseDTO'
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

export class EditPurchaseHandler {
  constructor(private readonly repo: IEventRepository) {}

  async execute(input: EditPurchaseInput): Promise<{ event: EventSnapshot; version: number }> {
    const parsed = EditPurchaseSchema.parse(input)

    const saved = await withOptimisticRetry(this.repo, parsed.eventId, (row) => {
      for (const c of parsed.consumers) {
        assertMember(row.snapshot, c.userId, 'Consumer')
      }
      assertMember(row.snapshot, parsed.editedBy, 'editedBy')

      const existing = requireById(row.snapshot.purchases, parsed.purchaseId, 'Purchase')
      if (existing.deleted) throw new Error('Cannot edit a deleted purchase')

      const updated = Purchase.restore(existing).edit({
        item: parsed.item,
        quantity: parsed.quantity,
        unit: parsed.unit,
        dailyConsumption: parsed.dailyConsumption,
        consumers: parsed.consumers,
        days: parsed.days,
        // Distinguish "not provided" (undefined → keep) from an explicit null
        // (the form clears the field), which `??` would wrongly swallow.
        assignedTo:
          parsed.assignedTo !== undefined ? parsed.assignedTo : (existing.assignedTo ?? null),
        group: parsed.group !== undefined ? parsed.group : (existing.group ?? null),
        subgroup: parsed.subgroup !== undefined ? parsed.subgroup : (existing.subgroup ?? null),
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
