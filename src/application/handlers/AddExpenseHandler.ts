import { AddExpenseSchema, type AddExpenseInput } from '@/application/dtos/AddExpenseDTO'
import { type EventSnapshot } from '@/domain/entities/Event'
import { Expense } from '@/domain/entities/Expense'
import { Money } from '@/domain/value-objects/Money'
import { HistoryAppender } from '@/domain/services/HistoryAppender'
import type { IEventRepository } from '@/domain/repositories/IEventRepository'
import { withOptimisticRetry } from '@/application/support/withOptimisticRetry'

export class AddExpenseHandler {
  constructor(private readonly repo: IEventRepository) {}

  async execute(input: AddExpenseInput): Promise<{ event: EventSnapshot; version: number }> {
    const parsed = AddExpenseSchema.parse(input)
    const saved = await withOptimisticRetry(this.repo, parsed.eventId, (row) => {
      if (!row.snapshot.users.some((u) => u.id === parsed.paidBy))
        throw new Error(`Payer ${parsed.paidBy} not in event`)

      if (parsed.splitAmong) {
        const knownIds = new Set(row.snapshot.users.map((u) => u.id))
        for (const id of parsed.splitAmong) {
          if (!knownIds.has(id)) throw new Error(`splitAmong user ${id} not in event`)
        }
      }

      const purchaseLinks = parsed.purchaseLinks ?? []
      if (purchaseLinks.length > 0) {
        const livePurchaseIds = new Set(
          row.snapshot.purchases.filter((p) => !p.deleted).map((p) => p.id),
        )
        for (const l of purchaseLinks) {
          if (!livePurchaseIds.has(l.purchaseId))
            throw new Error(`Link purchase ${l.purchaseId} not found`)
        }
      }

      const expense = Expense.create({
        paidBy: parsed.paidBy,
        amount: Money.fromEuros(parsed.amountEuros),
        description: parsed.description,
        purchaseId: parsed.purchaseId ?? null,
        date: parsed.date ? new Date(parsed.date) : undefined,
        splitAmong: parsed.splitAmong,
        purchaseLinks,
      })

      const payerName = row.snapshot.users.find((u) => u.id === parsed.paidBy)?.name ?? 'Someone'
      const nextSnapshot: EventSnapshot = HistoryAppender.append(
        { ...row.snapshot, expenses: [...row.snapshot.expenses, expense.toSnapshot()] },
        {
          type: 'expense_added',
          userId: parsed.paidBy,
          description: `${payerName} added expense: ${expense.toSnapshot().description}`,
        },
      )

      return nextSnapshot
    })
    return { event: saved.snapshot, version: saved.version }
  }
}
