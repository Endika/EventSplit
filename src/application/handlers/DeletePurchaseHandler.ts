import {
  DeletePurchaseSchema,
  type DeletePurchaseInput,
} from '@/application/dtos/DeletePurchaseDTO'
import type { EventSnapshot } from '@/domain/entities/Event'
import { Purchase } from '@/domain/entities/Purchase'
import { HistoryAppender } from '@/domain/services/HistoryAppender'
import { capTrash } from '@/domain/services/capTrash'
import { pruneGroupOrder, pruneSubgroupOrder } from '@/domain/services/pruneGroupOrder'
import type { IEventRepository } from '@/domain/repositories/IEventRepository'
import { withOptimisticRetry } from '@/application/support/withOptimisticRetry'

export class DeletePurchaseHandler {
  constructor(private readonly repo: IEventRepository) {}

  async execute(input: DeletePurchaseInput): Promise<{ event: EventSnapshot; version: number }> {
    const parsed = DeletePurchaseSchema.parse(input)
    const saved = await withOptimisticRetry(this.repo, parsed.eventId, (row) => {
      if (!row.snapshot.users.some((u) => u.id === parsed.deletedBy))
        throw new Error(`deletedBy ${parsed.deletedBy} not in event`)
      const existing = row.snapshot.purchases.find((p) => p.id === parsed.purchaseId)
      if (!existing) throw new Error(`Purchase ${parsed.purchaseId} not found`)
      if (existing.deleted) throw new Error('Cannot delete an already-deleted purchase')

      const deleted = Purchase.restore(existing).softDelete({
        by: parsed.deletedBy,
        reason: parsed.reason ?? null,
      })
      const editorName =
        row.snapshot.users.find((u) => u.id === parsed.deletedBy)?.name ?? 'Someone'
      const newPurchases = capTrash(
        row.snapshot.purchases.map((p) => (p.id === parsed.purchaseId ? deleted.toSnapshot() : p)),
      )
      const nextSnapshot: EventSnapshot = HistoryAppender.append(
        {
          ...row.snapshot,
          purchases: newPurchases,
          groupOrder: pruneGroupOrder(newPurchases, row.snapshot.groupOrder),
          subgroupOrder: pruneSubgroupOrder(newPurchases, row.snapshot.subgroupOrder),
        },
        {
          type: 'purchase_deleted',
          userId: parsed.deletedBy,
          description: `${editorName} deleted ${existing.item}`,
        },
      )
      return nextSnapshot
    })
    return { event: saved.snapshot, version: saved.version }
  }
}
