import { describe, it, expect } from 'vitest'
import { DeleteExpenseHandler } from '@/application/handlers/DeleteExpenseHandler'
import { addExpense, lastEntry, makeWorld } from '../../support/world'

describe('DeleteExpenseHandler', () => {
  it('soft-deletes only the chosen expense and records who did it', async () => {
    const w = await makeWorld()
    const first = await addExpense(w, 'Bread')
    const second = await addExpense(w, 'Milk')
    const result = await new DeleteExpenseHandler(w.repo).execute({
      eventId: w.eventId,
      expenseId: second,
      deletedBy: w.bob,
    })
    expect(result.event.expenses).toMatchObject([
      { id: first, deleted: false, deletedBy: null },
      { id: second, deleted: true, deletedBy: w.bob },
    ])
    expect(lastEntry(result.event)).toEqual({
      type: 'expense_deleted',
      userId: w.bob,
      description: 'Bob deleted expense: Milk',
    })
  })

  it('caps the trash at 5 deleted expenses, never touching live ones', async () => {
    const w = await makeWorld()
    const ids: string[] = []
    for (let i = 0; i < 8; i++) ids.push(await addExpense(w, `Expense ${i}`))
    let result
    for (const id of ids.slice(2)) {
      result = await new DeleteExpenseHandler(w.repo).execute({
        eventId: w.eventId,
        expenseId: id,
        deletedBy: w.john,
      })
    }
    const deleted = result!.event.expenses.filter((e) => e.deleted)
    const alive = result!.event.expenses.filter((e) => !e.deleted)
    expect(deleted).toHaveLength(5)
    expect(alive.map((e) => e.id).sort()).toEqual(ids.slice(0, 2).sort())
  })
})
