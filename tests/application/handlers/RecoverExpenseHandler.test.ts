import { describe, it, expect } from 'vitest'
import { RecoverExpenseHandler } from '@/application/handlers/RecoverExpenseHandler'
import { addExpense, lastEntry, makeWorld, trashExpense } from '../../support/world'

describe('RecoverExpenseHandler', () => {
  it('recovers only the chosen deleted expense and records history', async () => {
    const w = await makeWorld()
    const first = await addExpense(w, 'Bread')
    const second = await addExpense(w, 'Milk', { paidBy: w.bob })
    await trashExpense(w, first)
    await trashExpense(w, second)
    const result = await new RecoverExpenseHandler(w.repo).execute({
      eventId: w.eventId,
      expenseId: second,
      recoveredBy: w.alice,
    })
    expect(result.event.expenses).toMatchObject([
      { id: first, deleted: true },
      { id: second, deleted: false, deletedBy: null },
    ])
    expect(lastEntry(result.event)).toEqual({
      type: 'expense_recovered',
      userId: w.alice,
      description: 'Alice recovered expense: Milk',
    })
  })
})
