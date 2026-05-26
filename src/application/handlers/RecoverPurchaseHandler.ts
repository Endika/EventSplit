import { RecoverPurchaseSchema, type RecoverPurchaseInput } from '@/application/dtos/RecoverPurchaseDTO'
import type { EventSnapshot } from '@/domain/entities/Event'
import { Purchase } from '@/domain/entities/Purchase'
import { HistoryAppender } from '@/domain/services/HistoryAppender'
import { type IEventRepository, VersionConflictError } from '@/domain/repositories/IEventRepository'

const MAX_RETRIES = 3

export class RecoverPurchaseHandler {
  constructor(private readonly repo: IEventRepository) {}

  async execute(input: RecoverPurchaseInput): Promise<{ event: EventSnapshot; version: number }> {
    const parsed = RecoverPurchaseSchema.parse(input)
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const row = await this.repo.findById(parsed.eventId)
      if (!row) throw new Error('Event not found')
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
