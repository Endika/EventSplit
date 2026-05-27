import { DeleteExpenseSchema, type DeleteExpenseInput } from '@/application/dtos/DeleteExpenseDTO'
import type { EventSnapshot } from '@/domain/entities/Event'
import { Expense } from '@/domain/entities/Expense'
import { HistoryAppender } from '@/domain/services/HistoryAppender'
import { capTrash } from '@/domain/services/capTrash'
import type { IEventRepository } from '@/domain/repositories/IEventRepository'
import { withOptimisticRetry } from '@/application/support/withOptimisticRetry'

export class DeleteExpenseHandler {
  constructor(private readonly repo: IEventRepository) {}

  async execute(input: DeleteExpenseInput): Promise<{ event: EventSnapshot; version: number }> {
    const parsed = DeleteExpenseSchema.parse(input)
    const saved = await withOptimisticRetry(this.repo, parsed.eventId, (row) => {
      if (!row.snapshot.users.some((u) => u.id === parsed.deletedBy))
        throw new Error(`deletedBy ${parsed.deletedBy} not in event`)
      const existing = row.snapshot.expenses.find((e) => e.id === parsed.expenseId)
      if (!existing) throw new Error(`Expense ${parsed.expenseId} not found`)

      const deleted = Expense.restore(existing).softDelete({ by: parsed.deletedBy })
      const editorName = row.snapshot.users.find((u) => u.id === parsed.deletedBy)?.name ?? 'Someone'
      const nextSnapshot: EventSnapshot = HistoryAppender.append(
        {
          ...row.snapshot,
          expenses: capTrash(
            row.snapshot.expenses.map((e) =>
              e.id === parsed.expenseId ? deleted.toSnapshot() : e,
            ),
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
