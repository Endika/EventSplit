import { AssignPurchaseSchema, type AssignPurchaseInput } from '@/application/dtos/AssignPurchaseDTO'
import type { EventSnapshot } from '@/domain/entities/Event'
import { Purchase } from '@/domain/entities/Purchase'
import { HistoryAppender } from '@/domain/services/HistoryAppender'
import { type IEventRepository, VersionConflictError } from '@/domain/repositories/IEventRepository'

const MAX_RETRIES = 3

export class AssignPurchaseHandler {
  constructor(private readonly repo: IEventRepository) {}

  async execute(input: AssignPurchaseInput): Promise<{ event: EventSnapshot; version: number }> {
    const parsed = AssignPurchaseSchema.parse(input)
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const row = await this.repo.findById(parsed.eventId)
      if (!row) throw new Error('Event not found')
      const knownIds = new Set(row.snapshot.users.map((u) => u.id))
      if (!knownIds.has(parsed.editedBy)) throw new Error(`editedBy ${parsed.editedBy} not in event`)
      if (parsed.assignedTo !== null && !knownIds.has(parsed.assignedTo))
        throw new Error(`assignedTo ${parsed.assignedTo} not in event`)

      const existing = row.snapshot.purchases.find((p) => p.id === parsed.purchaseId)
      if (!existing) throw new Error(`Purchase ${parsed.purchaseId} not found`)

      const updated = Purchase.restore(existing).assign({
        assignedTo: parsed.assignedTo,
        purchased: parsed.purchased,
      })

      const editorName = row.snapshot.users.find((u) => u.id === parsed.editedBy)?.name ?? 'Someone'
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
          description: `${editorName} updated ${existing.item} assignment`,
          before: { assignedTo: existing.assignedTo ?? null, purchased: existing.purchased ?? false },
          after: { assignedTo: parsed.assignedTo, purchased: parsed.purchased },
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
