import { DeleteExpenseSchema, type DeleteExpenseInput } from '@/application/dtos/DeleteExpenseDTO'
import type { EventSnapshot } from '@/domain/entities/Event'
import { Expense } from '@/domain/entities/Expense'
import { HistoryAppender } from '@/domain/services/HistoryAppender'
import { capTrash } from '@/domain/services/capTrash'
import type { IEventRepository } from '@/domain/repositories/IEventRepository'
import { withOptimisticRetry } from '@/application/support/withOptimisticRetry'
import {
  assertMember,
  memberName,
  requireById,
  replaceById,
} from '@/application/support/snapshotLookups'

export class DeleteExpenseHandler {
  constructor(private readonly repo: IEventRepository) {}

  async execute(input: DeleteExpenseInput): Promise<{ event: EventSnapshot; version: number }> {
    const parsed = DeleteExpenseSchema.parse(input)
    const saved = await withOptimisticRetry(this.repo, parsed.eventId, (row) => {
      assertMember(row.snapshot, parsed.deletedBy, 'deletedBy')
      const existing = requireById(row.snapshot.expenses, parsed.expenseId, 'Expense')
      if (existing.deleted) throw new Error('Cannot delete an already-deleted expense')

      const deleted = Expense.restore(existing).softDelete({ by: parsed.deletedBy })
      const editorName = memberName(row.snapshot, parsed.deletedBy)
      const nextSnapshot: EventSnapshot = HistoryAppender.append(
        {
          ...row.snapshot,
          expenses: capTrash(
            replaceById(row.snapshot.expenses, parsed.expenseId, deleted.toSnapshot()),
          ),
        },
        {
          type: 'expense_deleted',
          userId: parsed.deletedBy,
          description: `${editorName} deleted expense: ${existing.description}`,
        },
      )
      return nextSnapshot
    })
    return { event: saved.snapshot, version: saved.version }
  }
}
