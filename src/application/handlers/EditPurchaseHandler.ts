import { EditPurchaseSchema, type EditPurchaseInput } from '@/application/dtos/EditPurchaseDTO'
import type { EventSnapshot } from '@/domain/entities/Event'
import { Purchase } from '@/domain/entities/Purchase'
import { HistoryAppender } from '@/domain/services/HistoryAppender'
import { type IEventRepository, VersionConflictError } from '@/domain/repositories/IEventRepository'

const MAX_RETRIES = 3

export class EditPurchaseHandler {
  constructor(private readonly repo: IEventRepository) {}

  async execute(input: EditPurchaseInput): Promise<{ event: EventSnapshot; version: number }> {
    const parsed = EditPurchaseSchema.parse(input)

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const row = await this.repo.findById(parsed.eventId)
      if (!row) throw new Error('Event not found')

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
        category: parsed.category,
        item: parsed.item,
        quantity: parsed.quantity,
        unit: parsed.unit,
        dailyConsumption: parsed.dailyConsumption,
        consumers: parsed.consumers,
        days: parsed.days,
        assignedTo: parsed.assignedTo ?? existing.assignedTo ?? null,
      })

      const editorName =
        row.snapshot.users.find((u) => u.id === parsed.editedBy)?.name ?? 'Someone'
      const nextSnapshot: EventSnapshot = HistoryAppender.append(
        {
          ...row.snapshot,
          purchases: row.snapshot.purchases.map((p) =>
            p.id === parsed.purchaseId ? updated.toSnapshot() : p,
          ),
        },
        {
          type: 'purchase_edited',
          userId: parsed.editedBy,
          description: `${editorName} edited ${existing.item}`,
          before: existing,
          after: updated.toSnapshot(),
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
