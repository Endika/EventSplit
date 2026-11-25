import {
  RecoverExpenseSchema,
  type RecoverExpenseInput,
} from '@/application/dtos/RecoverExpenseDTO'
import type { EventSnapshot } from '@/domain/entities/Event'
import { Expense } from '@/domain/entities/Expense'
import { HistoryAppender } from '@/domain/services/HistoryAppender'
import type { IEventRepository } from '@/domain/repositories/IEventRepository'
import { withOptimisticRetry } from '@/application/support/withOptimisticRetry'
import {
  assertMember,
  memberName,
  requireById,
  replaceById,
} from '@/application/support/snapshotLookups'

export class RecoverExpenseHandler {
  constructor(private readonly repo: IEventRepository) {}

  async execute(input: RecoverExpenseInput): Promise<{ event: EventSnapshot; version: number }> {
    const parsed = RecoverExpenseSchema.parse(input)
    const saved = await withOptimisticRetry(this.repo, parsed.eventId, (row) => {
      assertMember(row.snapshot, parsed.recoveredBy, 'recoveredBy')
      const existing = requireById(row.snapshot.expenses, parsed.expenseId, 'Expense')
      if (!row.snapshot.users.some((u) => u.id === existing.paidBy))
        throw new Error('Cannot recover an expense whose payer is no longer in the event')

      const recovered = Expense.restore(existing).recover()
      const editorName = memberName(row.snapshot, parsed.recoveredBy)
      const nextSnapshot: EventSnapshot = HistoryAppender.append(
        {
          ...row.snapshot,
          expenses: replaceById(row.snapshot.expenses, parsed.expenseId, recovered.toSnapshot()),
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
