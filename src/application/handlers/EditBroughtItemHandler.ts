import { EditBroughtItemSchema, type EditBroughtItemInput } from '@/application/dtos/EditBroughtItemDTO'
import type { EventSnapshot } from '@/domain/entities/Event'
import { Purchase } from '@/domain/entities/Purchase'
import { HistoryAppender } from '@/domain/services/HistoryAppender'
import { pruneGroupOrder } from '@/domain/services/pruneGroupOrder'
import { type IEventRepository, VersionConflictError } from '@/domain/repositories/IEventRepository'

const MAX_RETRIES = 3

export class EditBroughtItemHandler {
  constructor(private readonly repo: IEventRepository) {}

  async execute(input: EditBroughtItemInput): Promise<{ event: EventSnapshot; version: number }> {
    const parsed = EditBroughtItemSchema.parse(input)

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const row = await this.repo.findById(parsed.eventId)
      if (!row) throw new Error('Event not found')

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
        broughtBy: parsed.broughtBy ?? null,
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
