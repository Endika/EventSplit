import {
  AssignPurchaseSchema,
  type AssignPurchaseInput,
} from '@/application/dtos/AssignPurchaseDTO'
import type { EventSnapshot } from '@/domain/entities/Event'
import { Purchase } from '@/domain/entities/Purchase'
import { HistoryAppender } from '@/domain/services/HistoryAppender'
import type { IEventRepository } from '@/domain/repositories/IEventRepository'
import { withOptimisticRetry } from '@/application/support/withOptimisticRetry'
import { assertMember, memberName } from '@/application/support/eventMembers'

export class AssignPurchaseHandler {
  constructor(private readonly repo: IEventRepository) {}

  async execute(input: AssignPurchaseInput): Promise<{ event: EventSnapshot; version: number }> {
    const parsed = AssignPurchaseSchema.parse(input)
    const saved = await withOptimisticRetry(this.repo, parsed.eventId, (row) => {
      assertMember(row.snapshot, parsed.editedBy, 'editedBy')
      if (parsed.assignedTo !== null) assertMember(row.snapshot, parsed.assignedTo, 'assignedTo')

      const existing = row.snapshot.purchases.find((p) => p.id === parsed.purchaseId)
      if (!existing) throw new Error(`Purchase ${parsed.purchaseId} not found`)

      const updated = Purchase.restore(existing).assign({
        assignedTo: parsed.assignedTo,
        purchased: parsed.purchased,
      })

      const editorName = memberName(row.snapshot, parsed.editedBy)
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
        },
      )

      return nextSnapshot
    })
    return { event: saved.snapshot, version: saved.version }
  }
}
