import { EditExpenseSchema, type EditExpenseInput } from '@/application/dtos/EditExpenseDTO'
import type { EventSnapshot } from '@/domain/entities/Event'
import { Expense } from '@/domain/entities/Expense'
import { Money } from '@/domain/value-objects/Money'
import { HistoryAppender } from '@/domain/services/HistoryAppender'
import { type IEventRepository, VersionConflictError } from '@/domain/repositories/IEventRepository'

const MAX_RETRIES = 3

export class EditExpenseHandler {
  constructor(private readonly repo: IEventRepository) {}

  async execute(input: EditExpenseInput): Promise<{ event: EventSnapshot; version: number }> {
    const parsed = EditExpenseSchema.parse(input)
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const row = await this.repo.findById(parsed.eventId)
      if (!row) throw new Error('Event not found')
      const knownIds = new Set(row.snapshot.users.map((u) => u.id))
      if (!knownIds.has(parsed.editedBy)) throw new Error(`editedBy ${parsed.editedBy} not in event`)
      if (!knownIds.has(parsed.paidBy)) throw new Error(`Payer ${parsed.paidBy} not in event`)
      if (parsed.splitAmong) {
        for (const id of parsed.splitAmong) {
          if (!knownIds.has(id)) throw new Error(`splitAmong user ${id} not in event`)
        }
      }
      const existing = row.snapshot.expenses.find((e) => e.id === parsed.expenseId)
      if (!existing) throw new Error(`Expense ${parsed.expenseId} not found`)
      if (existing.deleted) throw new Error('Cannot edit a deleted expense')

      const updated = Expense.restore(existing).edit({
        paidBy: parsed.paidBy,
        amount: Money.fromEuros(parsed.amountEuros),
        description: parsed.description,
        splitAmong: parsed.splitAmong,
      })
      const editorName = row.snapshot.users.find((u) => u.id === parsed.editedBy)?.name ?? 'Someone'
      const nextSnapshot: EventSnapshot = HistoryAppender.append(
        {
          ...row.snapshot,
          expenses: row.snapshot.expenses.map((e) =>
            e.id === parsed.expenseId ? updated.toSnapshot() : e,
          ),
        },
        {
          type: 'expense_edited',
          userId: parsed.editedBy,
          description: `${editorName} edited expense: ${updated.toSnapshot().description}`,
          before: existing,
          after: updated.toSnapshot(),
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
