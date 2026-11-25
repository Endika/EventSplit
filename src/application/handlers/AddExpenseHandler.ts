import { AddExpenseSchema, type AddExpenseInput } from '@/application/dtos/AddExpenseDTO'
import { type EventSnapshot } from '@/domain/entities/Event'
import { Expense } from '@/domain/entities/Expense'
import { Money } from '@/domain/value-objects/Money'
import { HistoryAppender } from '@/domain/services/HistoryAppender'
import type { IEventRepository } from '@/domain/repositories/IEventRepository'
import { withOptimisticRetry } from '@/application/support/withOptimisticRetry'
import {
  assertMember,
  memberName,
  assertLivePurchases,
} from '@/application/support/snapshotLookups'

export class AddExpenseHandler {
  constructor(private readonly repo: IEventRepository) {}

  async execute(input: AddExpenseInput): Promise<{ event: EventSnapshot; version: number }> {
    const parsed = AddExpenseSchema.parse(input)
    const saved = await withOptimisticRetry(this.repo, parsed.eventId, (row) => {
      assertMember(row.snapshot, parsed.paidBy, 'Payer')

      // The operator who recorded the expense; defaults to the payer for legacy callers.
      const createdBy = parsed.createdBy ?? parsed.paidBy
      assertMember(row.snapshot, createdBy, 'Creator')

      if (parsed.splitAmong) {
        for (const id of parsed.splitAmong) {
          assertMember(row.snapshot, id, 'splitAmong user')
        }
      }

      const purchaseLinks = parsed.purchaseLinks ?? []
      assertLivePurchases(row.snapshot, purchaseLinks)

      const expense = Expense.create({
        paidBy: parsed.paidBy,
        amount: Money.fromEuros(parsed.amountEuros),
        description: parsed.description,
        purchaseId: parsed.purchaseId ?? null,
        date: parsed.date ? new Date(parsed.date) : undefined,
        splitAmong: parsed.splitAmong,
        purchaseLinks,
      })

      const nameOf = (id: string) => memberName(row.snapshot, id)
      const operatorName = nameOf(createdBy)
      const desc = expense.toSnapshot().description
      // Attribute the action to the operator; note the payer only when it differs.
      const description =
        createdBy === parsed.paidBy
          ? `${operatorName} added expense: ${desc}`
          : `${operatorName} added expense: ${desc} (paid by ${nameOf(parsed.paidBy)})`
      const nextSnapshot: EventSnapshot = HistoryAppender.append(
        { ...row.snapshot, expenses: [...row.snapshot.expenses, expense.toSnapshot()] },
        {
          type: 'expense_added',
          userId: createdBy,
          description,
        },
      )

      return nextSnapshot
    })
    return { event: saved.snapshot, version: saved.version }
  }
}
