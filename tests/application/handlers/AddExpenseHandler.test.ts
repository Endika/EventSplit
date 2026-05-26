import { describe, it, expect } from 'vitest'
import { CreateEventHandler } from '@/application/handlers/CreateEventHandler'
import { AddExpenseHandler } from '@/application/handlers/AddExpenseHandler'
import { AddPurchaseHandler } from '@/application/handlers/AddPurchaseHandler'
import { InMemoryEventRepository } from '@/infrastructure/persistence/InMemoryEventRepository'

describe('AddExpenseHandler', () => {
  it('adds the expense and appends history', async () => {
    const repo = new InMemoryEventRepository()
    const create = await new CreateEventHandler(repo).execute({ name: 'Trip', creatorName: 'John' })
    const result = await new AddExpenseHandler(repo).execute({
      eventId: create.event.id,
      paidBy: create.creator.id,
      amountEuros: 12.34,
      description: 'Bread and milk',
    })
    expect(result.event.expenses).toHaveLength(1)
    expect(result.event.expenses[0]!.cents).toBe(1234)
    expect(result.event.history.at(-1)?.type).toBe('expense_added')
  })

  it('rejects payer not in event', async () => {
    const repo = new InMemoryEventRepository()
    const create = await new CreateEventHandler(repo).execute({ name: 'Trip', creatorName: 'John' })
    await expect(
      new AddExpenseHandler(repo).execute({
        eventId: create.event.id,
        paidBy: '018f4a8e-0000-7000-8000-000000000000',
        amountEuros: 10,
        description: 'Bread',
      }),
    ).rejects.toThrow(/not in event/i)
  })

  it('saves the splitAmong list', async () => {
    const repo = new InMemoryEventRepository()
    const create = await new CreateEventHandler(repo).execute({ name: 'Trip', creatorName: 'John' })
    const result = await new AddExpenseHandler(repo).execute({
      eventId: create.event.id,
      paidBy: create.creator.id,
      amountEuros: 10,
      description: 'Snacks',
      splitAmong: [create.creator.id],
    })
    expect(result.event.expenses[0]!.splitAmong).toEqual([create.creator.id])
  })

  it('rejects splitAmong member not in event', async () => {
    const repo = new InMemoryEventRepository()
    const create = await new CreateEventHandler(repo).execute({ name: 'Trip', creatorName: 'John' })
    await expect(
      new AddExpenseHandler(repo).execute({
        eventId: create.event.id,
        paidBy: create.creator.id,
        amountEuros: 10,
        description: 'Snacks',
        splitAmong: ['018f4a8e-0000-7000-8000-000000000000'],
      }),
    ).rejects.toThrow(/splitAmong.*not in event/i)
  })

  it('marks linked purchases as bought when adding an expense', async () => {
    const repo = new InMemoryEventRepository()
    const create = await new CreateEventHandler(repo).execute({ name: 'Trip', creatorName: 'John' })
    const added = await new AddPurchaseHandler(repo).execute({
      eventId: create.event.id, createdBy: create.creator.id,
      category: 'drinks', item: 'Coke', quantity: 1, unit: 'units',
      dailyConsumption: 1, consumers: [{ userId: create.creator.id, multiplier: 1 }], days: 1,
    })
    const purchaseId = added.event.purchases[0]!.id
    const result = await new AddExpenseHandler(repo).execute({
      eventId: create.event.id,
      paidBy: create.creator.id,
      amountEuros: 10,
      description: 'Supermarket',
      markPurchasedIds: [purchaseId],
    })
    expect(result.event.purchases.find((p) => p.id === purchaseId)!.purchased).toBe(true)
    expect(result.event.expenses).toHaveLength(1)
  })
})
