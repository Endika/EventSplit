import { describe, it, expect } from 'vitest'
import { AddExpenseHandler } from '@/application/handlers/AddExpenseHandler'
import { addPurchase, lastEntry, makeWorld } from '../../support/world'

describe('AddExpenseHandler', () => {
  it('adds the expense, attributing history to the operator and noting a different payer', async () => {
    const w = await makeWorld()
    const handler = new AddExpenseHandler(w.repo)
    const own = await handler.execute({
      eventId: w.eventId,
      paidBy: w.john,
      amountEuros: 12.34,
      description: 'Bread and milk',
    })
    expect(own.event.expenses).toMatchObject([
      { paidBy: w.john, cents: 1234, description: 'Bread and milk', purchaseId: null },
    ])
    expect(lastEntry(own.event)).toEqual({
      type: 'expense_added',
      userId: w.john,
      description: 'John added expense: Bread and milk',
    })

    const proxied = await handler.execute({
      eventId: w.eventId,
      paidBy: w.alice,
      createdBy: w.bob,
      amountEuros: 10,
      description: 'Beer',
    })
    expect(proxied.event.expenses).toHaveLength(2)
    expect(lastEntry(proxied.event)).toEqual({
      type: 'expense_added',
      userId: w.bob,
      description: 'Bob added expense: Beer (paid by Alice)',
    })
  })

  it('saves the split and the purchase links without mutating the purchase', async () => {
    const w = await makeWorld()
    const purchaseId = await addPurchase(w, 'Coke')
    const result = await new AddExpenseHandler(w.repo).execute({
      eventId: w.eventId,
      paidBy: w.john,
      amountEuros: 10,
      description: 'Supermarket',
      splitAmong: [w.john, w.alice],
      purchaseId,
      purchaseLinks: [{ purchaseId, quantity: 6 }],
    })
    expect(result.event.expenses[0]).toMatchObject({
      purchaseId,
      splitAmong: [w.john, w.alice],
      purchaseLinks: [{ purchaseId, quantity: 6 }],
    })
    expect(result.event.purchases[0]!.purchased).toBe(false)
  })
})
