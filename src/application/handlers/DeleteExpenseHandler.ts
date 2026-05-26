import { DeleteExpenseSchema, type DeleteExpenseInput } from '@/application/dtos/DeleteExpenseDTO'
import type { EventSnapshot } from '@/domain/entities/Event'
import { Expense } from '@/domain/entities/Expense'
import { HistoryAppender } from '@/domain/services/HistoryAppender'
import { type IEventRepository, VersionConflictError } from '@/domain/repositories/IEventRepository'

const MAX_RETRIES = 3

export class DeleteExpenseHandler {
  constructor(private readonly repo: IEventRepository) {}

  async execute(input: DeleteExpenseInput): Promise<{ event: EventSnapshot; version: number }> {
    const parsed = DeleteExpenseSchema.parse(input)
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const row = await this.repo.findById(parsed.eventId)
      if (!row) throw new Error('Event not found')
      if (!row.snapshot.users.some((u) => u.id === parsed.deletedBy))
        throw new Error(`deletedBy ${parsed.deletedBy} not in event`)
      const existing = row.snapshot.expenses.find((e) => e.id === parsed.expenseId)
      if (!existing) throw new Error(`Expense ${parsed.expenseId} not found`)

      const deleted = Expense.restore(existing).softDelete({ by: parsed.deletedBy })
      const editorName = row.snapshot.users.find((u) => u.id === parsed.deletedBy)?.name ?? 'Someone'
      const nextSnapshot: EventSnapshot = HistoryAppender.append(
        {
          ...row.snapshot,
          expenses: row.snapshot.expenses.map((e) =>
            e.id === parsed.expenseId ? deleted.toSnapshot() : e,
          ),
        },
        {
          type: 'expense_deleted',
          userId: parsed.deletedBy,
          description: `${editorName} deleted expense: ${existing.description}`,
          before: existing,
          after: null,
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
