import { describe, it, expect } from 'vitest'
import { EditExpenseHandler } from '@/application/handlers/EditExpenseHandler'
import { addExpense, addPurchase, lastEntry, makeWorld } from '../../support/world'

describe('EditExpenseHandler', () => {
  it('updates amount, description, payer and split of one expense, leaving the other alone', async () => {
    const w = await makeWorld()
    const first = await addExpense(w, 'Bread')
    const second = await addExpense(w, 'Milk')
    const result = await new EditExpenseHandler(w.repo).execute({
      eventId: w.eventId,
      expenseId: second,
      editedBy: w.bob,
      paidBy: w.john,
      amountEuros: 25.5,
      description: 'Bread and milk',
      splitAmong: [w.john, w.bob],
    })
    expect(result.event.expenses).toMatchObject([
      { id: first, description: 'Bread', cents: 1000, paidBy: w.alice },
      {
        id: second,
        description: 'Bread and milk',
        cents: 2550,
        paidBy: w.john,
        splitAmong: [w.john, w.bob],
      },
    ])
    expect(lastEntry(result.event)).toEqual({
      type: 'expense_edited',
      userId: w.bob,
      description: 'Bob edited expense: Bread and milk',
    })
  })

  it('replaces the linked quantity when given and keeps it when omitted, never touching the purchase', async () => {
    const w = await makeWorld()
    const purchaseId = await addPurchase(w, 'Coke')
    const expenseId = await addExpense(w, 'Shop', { purchaseLinks: [{ purchaseId, quantity: 6 }] })
    const edit = (purchaseLinks?: { purchaseId: string; quantity: number }[]) =>
      new EditExpenseHandler(w.repo).execute({
        eventId: w.eventId,
        expenseId,
        editedBy: w.john,
        paidBy: w.alice,
        amountEuros: 10,
        description: 'Shop',
        purchaseLinks,
      })

    const fewer = await edit([{ purchaseId, quantity: 3 }])
    expect(fewer.event.expenses[0]!.purchaseLinks).toEqual([{ purchaseId, quantity: 3 }])
    expect(fewer.event.purchases[0]!.purchased).toBe(false)

    const kept = await edit()
    expect(kept.event.expenses[0]!.purchaseLinks).toEqual([{ purchaseId, quantity: 3 }])
  })
})
