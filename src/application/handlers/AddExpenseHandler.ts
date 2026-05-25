import { AddExpenseSchema, type AddExpenseInput } from '@/application/dtos/AddExpenseDTO'
import { type EventSnapshot } from '@/domain/entities/Event'
import { Expense } from '@/domain/entities/Expense'
import { Money } from '@/domain/value-objects/Money'
import { HistoryAppender } from '@/domain/services/HistoryAppender'
import { type IEventRepository, VersionConflictError } from '@/domain/repositories/IEventRepository'

const MAX_RETRIES = 3

export class AddExpenseHandler {
  constructor(private readonly repo: IEventRepository) {}

  async execute(input: AddExpenseInput): Promise<{ event: EventSnapshot; version: number }> {
    const parsed = AddExpenseSchema.parse(input)
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const row = await this.repo.findById(parsed.eventId)
      if (!row) throw new Error('Event not found')
      if (!row.snapshot.users.some((u) => u.id === parsed.paidBy))
        throw new Error(`Payer ${parsed.paidBy} not in event`)

      const expense = Expense.create({
        paidBy: parsed.paidBy,
        amount: Money.fromEuros(parsed.amountEuros),
        description: parsed.description,
        purchaseId: parsed.purchaseId ?? null,
        date: parsed.date ? new Date(parsed.date) : undefined,
      })

      const payerName = row.snapshot.users.find((u) => u.id === parsed.paidBy)?.name ?? 'Someone'
      const nextSnapshot: EventSnapshot = HistoryAppender.append(
        { ...row.snapshot, expenses: [...row.snapshot.expenses, expense.toSnapshot()] },
        {
          type: 'expense_added', userId: parsed.paidBy,
          description: `${payerName} added expense: ${expense.toSnapshot().description}`,
          before: null, after: { expenseId: expense.id, cents: expense.amount.cents },
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
