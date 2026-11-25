import { EditExpenseSchema, type EditExpenseInput } from '@/application/dtos/EditExpenseDTO'
import type { EventSnapshot } from '@/domain/entities/Event'
import { Expense } from '@/domain/entities/Expense'
import { Money } from '@/domain/value-objects/Money'
import { HistoryAppender } from '@/domain/services/HistoryAppender'
import type { IEventRepository } from '@/domain/repositories/IEventRepository'
import { withOptimisticRetry } from '@/application/support/withOptimisticRetry'
import {
  assertMember,
  memberName,
  requireById,
  replaceById,
  assertLivePurchases,
} from '@/application/support/snapshotLookups'

export class EditExpenseHandler {
  constructor(private readonly repo: IEventRepository) {}

  async execute(input: EditExpenseInput): Promise<{ event: EventSnapshot; version: number }> {
    const parsed = EditExpenseSchema.parse(input)
    const saved = await withOptimisticRetry(this.repo, parsed.eventId, (row) => {
      assertMember(row.snapshot, parsed.editedBy, 'editedBy')
      assertMember(row.snapshot, parsed.paidBy, 'Payer')
      if (parsed.splitAmong) {
        for (const id of parsed.splitAmong) {
          assertMember(row.snapshot, id, 'splitAmong user')
        }
      }
      const existing = requireById(row.snapshot.expenses, parsed.expenseId, 'Expense')
      if (existing.deleted) throw new Error('Cannot edit a deleted expense')

      assertLivePurchases(row.snapshot, parsed.purchaseLinks ?? [])

      const updated = Expense.restore(existing).edit({
        paidBy: parsed.paidBy,
        amount: Money.fromEuros(parsed.amountEuros),
        description: parsed.description,
        splitAmong: parsed.splitAmong,
        ...(parsed.purchaseLinks !== undefined ? { purchaseLinks: parsed.purchaseLinks } : {}),
      })

      const editorName = memberName(row.snapshot, parsed.editedBy)
      const nextSnapshot: EventSnapshot = HistoryAppender.append(
        {
          ...row.snapshot,
          expenses: replaceById(row.snapshot.expenses, parsed.expenseId, updated.toSnapshot()),
        },
        {
          type: 'expense_edited',
          userId: parsed.editedBy,
          description: `${editorName} edited expense: ${updated.toSnapshot().description}`,
        },
      )
      return nextSnapshot
    })
    return { event: saved.snapshot, version: saved.version }
  }
}
