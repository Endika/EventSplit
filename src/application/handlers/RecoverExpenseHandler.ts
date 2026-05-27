import {
  RecoverExpenseSchema,
  type RecoverExpenseInput,
} from '@/application/dtos/RecoverExpenseDTO'
import type { EventSnapshot } from '@/domain/entities/Event'
import { Expense } from '@/domain/entities/Expense'
import { HistoryAppender } from '@/domain/services/HistoryAppender'
import type { IEventRepository } from '@/domain/repositories/IEventRepository'
import { withOptimisticRetry } from '@/application/support/withOptimisticRetry'

export class RecoverExpenseHandler {
  constructor(private readonly repo: IEventRepository) {}

  async execute(input: RecoverExpenseInput): Promise<{ event: EventSnapshot; version: number }> {
    const parsed = RecoverExpenseSchema.parse(input)
    const saved = await withOptimisticRetry(this.repo, parsed.eventId, (row) => {
      if (!row.snapshot.users.some((u) => u.id === parsed.recoveredBy))
        throw new Error(`recoveredBy ${parsed.recoveredBy} not in event`)
      const existing = row.snapshot.expenses.find((e) => e.id === parsed.expenseId)
      if (!existing) throw new Error(`Expense ${parsed.expenseId} not found`)
      if (!row.snapshot.users.some((u) => u.id === existing.paidBy))
        throw new Error('Cannot recover an expense whose payer is no longer in the event')

      const recovered = Expense.restore(existing).recover()
      const editorName =
        row.snapshot.users.find((u) => u.id === parsed.recoveredBy)?.name ?? 'Someone'
      const nextSnapshot: EventSnapshot = HistoryAppender.append(
        {
          ...row.snapshot,
          expenses: row.snapshot.expenses.map((e) =>
            e.id === parsed.expenseId ? recovered.toSnapshot() : e,
          ),
        },
        {
          type: 'expense_recovered',
          userId: parsed.recoveredBy,
          description: `${editorName} recovered expense: ${existing.description}`,
        },
      )
      return nextSnapshot
    })
    return { event: saved.snapshot, version: saved.version }
  }
}
