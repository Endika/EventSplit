import { RecoverExpenseSchema, type RecoverExpenseInput } from '@/application/dtos/RecoverExpenseDTO'
import type { EventSnapshot } from '@/domain/entities/Event'
import { Expense } from '@/domain/entities/Expense'
import { HistoryAppender } from '@/domain/services/HistoryAppender'
import { type IEventRepository, VersionConflictError } from '@/domain/repositories/IEventRepository'

const MAX_RETRIES = 3

export class RecoverExpenseHandler {
  constructor(private readonly repo: IEventRepository) {}

  async execute(input: RecoverExpenseInput): Promise<{ event: EventSnapshot; version: number }> {
    const parsed = RecoverExpenseSchema.parse(input)
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const row = await this.repo.findById(parsed.eventId)
      if (!row) throw new Error('Event not found')
      if (!row.snapshot.users.some((u) => u.id === parsed.recoveredBy))
        throw new Error(`recoveredBy ${parsed.recoveredBy} not in event`)
      const existing = row.snapshot.expenses.find((e) => e.id === parsed.expenseId)
      if (!existing) throw new Error(`Expense ${parsed.expenseId} not found`)

      const recovered = Expense.restore(existing).recover()
      const editorName = row.snapshot.users.find((u) => u.id === parsed.recoveredBy)?.name ?? 'Someone'
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
          before: null,
          after: { expenseId: existing.id, description: existing.description },
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
