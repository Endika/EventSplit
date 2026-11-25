import {
  AssignPurchaseSchema,
  type AssignPurchaseInput,
} from '@/application/dtos/AssignPurchaseDTO'
import type { EventSnapshot } from '@/domain/entities/Event'
import { Purchase } from '@/domain/entities/Purchase'
import { HistoryAppender } from '@/domain/services/HistoryAppender'
import type { IEventRepository } from '@/domain/repositories/IEventRepository'
import { withOptimisticRetry } from '@/application/support/withOptimisticRetry'
import {
  assertMember,
  memberName,
  requireById,
  replaceById,
} from '@/application/support/snapshotLookups'

export class AssignPurchaseHandler {
  constructor(private readonly repo: IEventRepository) {}

  async execute(input: AssignPurchaseInput): Promise<{ event: EventSnapshot; version: number }> {
    const parsed = AssignPurchaseSchema.parse(input)
    const saved = await withOptimisticRetry(this.repo, parsed.eventId, (row) => {
      assertMember(row.snapshot, parsed.editedBy, 'editedBy')
      if (parsed.assignedTo !== null) assertMember(row.snapshot, parsed.assignedTo, 'assignedTo')

      const existing = requireById(row.snapshot.purchases, parsed.purchaseId, 'Purchase')

      const updated = Purchase.restore(existing).assign({
        assignedTo: parsed.assignedTo,
        purchased: parsed.purchased,
      })

      const editorName = memberName(row.snapshot, parsed.editedBy)
      const nextSnapshot: EventSnapshot = HistoryAppender.append(
        {
          ...row.snapshot,
          purchases: replaceById(row.snapshot.purchases, parsed.purchaseId, updated.toSnapshot()),
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
