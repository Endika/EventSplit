import { RecoverPurchaseSchema, type RecoverPurchaseInput } from '@/application/dtos/RecoverPurchaseDTO'
import type { EventSnapshot } from '@/domain/entities/Event'
import { Purchase } from '@/domain/entities/Purchase'
import { HistoryAppender } from '@/domain/services/HistoryAppender'
import type { IEventRepository } from '@/domain/repositories/IEventRepository'
import { withOptimisticRetry } from '@/application/support/withOptimisticRetry'

export class RecoverPurchaseHandler {
  constructor(private readonly repo: IEventRepository) {}

  async execute(input: RecoverPurchaseInput): Promise<{ event: EventSnapshot; version: number }> {
    const parsed = RecoverPurchaseSchema.parse(input)
    const saved = await withOptimisticRetry(this.repo, parsed.eventId, (row) => {
      if (!row.snapshot.users.some((u) => u.id === parsed.recoveredBy))
        throw new Error(`recoveredBy ${parsed.recoveredBy} not in event`)
      const existing = row.snapshot.purchases.find((p) => p.id === parsed.purchaseId)
      if (!existing) throw new Error(`Purchase ${parsed.purchaseId} not found`)

      const recovered = Purchase.restore(existing).recover()
      const editorName = row.snapshot.users.find((u) => u.id === parsed.recoveredBy)?.name ?? 'Someone'
      const nextSnapshot: EventSnapshot = HistoryAppender.append(
        {
          ...row.snapshot,
          purchases: row.snapshot.purchases.map((p) =>
            p.id === parsed.purchaseId ? recovered.toSnapshot() : p,
          ),
        },
        {
          type: 'purchase_recovered',
          userId: parsed.recoveredBy,
          description: `${editorName} recovered ${existing.item}`,
        },
      )
      return nextSnapshot
    })
    return { event: saved.snapshot, version: saved.version }
  }
}
