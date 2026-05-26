import { DeletePurchaseSchema, type DeletePurchaseInput } from '@/application/dtos/DeletePurchaseDTO'
import type { EventSnapshot } from '@/domain/entities/Event'
import { Purchase } from '@/domain/entities/Purchase'
import { HistoryAppender } from '@/domain/services/HistoryAppender'
import { pruneGroupOrder } from '@/domain/services/pruneGroupOrder'
import { type IEventRepository, VersionConflictError } from '@/domain/repositories/IEventRepository'

const MAX_RETRIES = 3

export class DeletePurchaseHandler {
  constructor(private readonly repo: IEventRepository) {}

  async execute(input: DeletePurchaseInput): Promise<{ event: EventSnapshot; version: number }> {
    const parsed = DeletePurchaseSchema.parse(input)
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const row = await this.repo.findById(parsed.eventId)
      if (!row) throw new Error('Event not found')
      if (!row.snapshot.users.some((u) => u.id === parsed.deletedBy))
        throw new Error(`deletedBy ${parsed.deletedBy} not in event`)
      const existing = row.snapshot.purchases.find((p) => p.id === parsed.purchaseId)
      if (!existing) throw new Error(`Purchase ${parsed.purchaseId} not found`)

      const deleted = Purchase.restore(existing).softDelete({
        by: parsed.deletedBy,
        reason: parsed.reason ?? null,
      })
      const editorName = row.snapshot.users.find((u) => u.id === parsed.deletedBy)?.name ?? 'Someone'
      const newPurchases = row.snapshot.purchases.map((p) =>
        p.id === parsed.purchaseId ? deleted.toSnapshot() : p,
      )
      const nextSnapshot: EventSnapshot = HistoryAppender.append(
        {
          ...row.snapshot,
          purchases: newPurchases,
          groupOrder: pruneGroupOrder(newPurchases, row.snapshot.groupOrder),
        },
        {
          type: 'purchase_deleted',
          userId: parsed.deletedBy,
          description: `${editorName} deleted ${existing.item}`,
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
