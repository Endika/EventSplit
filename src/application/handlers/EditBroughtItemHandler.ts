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

export class EditBroughtItemHandler {
  constructor(private readonly repo: IEventRepository) {}

  async execute(input: EditBroughtItemInput): Promise<{ event: EventSnapshot; version: number }> {
    const parsed = EditBroughtItemSchema.parse(input)

    const saved = await withOptimisticRetry(this.repo, parsed.eventId, (row) => {
      const knownIds = new Set(row.snapshot.users.map((u) => u.id))
      if (!knownIds.has(parsed.editedBy))
        throw new Error(`editedBy ${parsed.editedBy} not in event`)
      if (parsed.broughtBy != null && !knownIds.has(parsed.broughtBy))
        throw new Error(`broughtBy ${parsed.broughtBy} not in event`)

      const existing = row.snapshot.purchases.find((p) => p.id === parsed.purchaseId)
      if (!existing) throw new Error(`Purchase ${parsed.purchaseId} not found`)
      if (existing.deleted) throw new Error('Cannot edit a deleted purchase')

      const updated = Purchase.restore(existing).editBring({
        item: parsed.item,
        quantity: parsed.quantity,
        unit: parsed.unit,
        group: parsed.group ?? null,
        subgroup: parsed.subgroup ?? null,
        broughtBy: parsed.broughtBy ?? null,
      })

      const editorName = row.snapshot.users.find((u) => u.id === parsed.editedBy)?.name ?? 'Someone'
      const newPurchases = row.snapshot.purchases.map((p) =>
        p.id === parsed.purchaseId ? updated.toSnapshot() : p,
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
