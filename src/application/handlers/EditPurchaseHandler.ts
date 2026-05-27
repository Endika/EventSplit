import { EditPurchaseSchema, type EditPurchaseInput } from '@/application/dtos/EditPurchaseDTO'
import type { EventSnapshot } from '@/domain/entities/Event'
import { Purchase } from '@/domain/entities/Purchase'
import { HistoryAppender } from '@/domain/services/HistoryAppender'
import { pruneGroupOrder } from '@/domain/services/pruneGroupOrder'
import type { IEventRepository } from '@/domain/repositories/IEventRepository'
import { withOptimisticRetry } from '@/application/support/withOptimisticRetry'

export class EditPurchaseHandler {
  constructor(private readonly repo: IEventRepository) {}

  async execute(input: EditPurchaseInput): Promise<{ event: EventSnapshot; version: number }> {
    const parsed = EditPurchaseSchema.parse(input)

    const saved = await withOptimisticRetry(this.repo, parsed.eventId, (row) => {
      const knownIds = new Set(row.snapshot.users.map((u) => u.id))
      for (const c of parsed.consumers) {
        if (!knownIds.has(c.userId)) throw new Error(`Consumer ${c.userId} not in event`)
      }
      if (!knownIds.has(parsed.editedBy))
        throw new Error(`editedBy ${parsed.editedBy} not in event`)

      const existing = row.snapshot.purchases.find((p) => p.id === parsed.purchaseId)
      if (!existing) throw new Error(`Purchase ${parsed.purchaseId} not found`)
      if (existing.deleted) throw new Error('Cannot edit a deleted purchase')

      const updated = Purchase.restore(existing).edit({
        item: parsed.item,
        quantity: parsed.quantity,
        unit: parsed.unit,
        dailyConsumption: parsed.dailyConsumption,
        consumers: parsed.consumers,
        days: parsed.days,
        assignedTo: parsed.assignedTo ?? existing.assignedTo ?? null,
        group: parsed.group ?? existing.group ?? null,
      })

      const editorName =
        row.snapshot.users.find((u) => u.id === parsed.editedBy)?.name ?? 'Someone'
      const newPurchases = row.snapshot.purchases.map((p) =>
        p.id === parsed.purchaseId ? updated.toSnapshot() : p,
      )
      const nextSnapshot: EventSnapshot = HistoryAppender.append(
        {
          ...row.snapshot,
          purchases: newPurchases,
          groupOrder: pruneGroupOrder(newPurchases, row.snapshot.groupOrder),
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
