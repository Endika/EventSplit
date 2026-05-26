import { describe, it, expect } from 'vitest'
import { CreateEventHandler } from '@/application/handlers/CreateEventHandler'
import { AddExpenseHandler } from '@/application/handlers/AddExpenseHandler'
import { EditExpenseHandler } from '@/application/handlers/EditExpenseHandler'
import { InMemoryEventRepository } from '@/infrastructure/persistence/InMemoryEventRepository'

async function setup() {
  const repo = new InMemoryEventRepository()
  const create = await new CreateEventHandler(repo).execute({ name: 'Trip', creatorName: 'John' })
  const added = await new AddExpenseHandler(repo).execute({
    eventId: create.event.id,
    paidBy: create.creator.id,
    amountEuros: 10,
    description: 'Bread',
  })
  return { repo, eventId: create.event.id, userId: create.creator.id, expenseId: added.event.expenses[0]!.id }
}

describe('EditExpenseHandler', () => {
  it('updates amount, description and payer', async () => {
    const ctx = await setup()
    const result = await new EditExpenseHandler(ctx.repo).execute({
      eventId: ctx.eventId,
      expenseId: ctx.expenseId,
      editedBy: ctx.userId,
      paidBy: ctx.userId,
      amountEuros: 25.5,
      description: 'Bread and milk',
    })
    const e = result.event.expenses[0]!
    expect(e.cents).toBe(2550)
    expect(e.description).toBe('Bread and milk')
    expect(result.event.history.at(-1)?.type).toBe('expense_edited')
  })

  it('rejects unknown expense id', async () => {
    const ctx = await setup()
    await expect(
      new EditExpenseHandler(ctx.repo).execute({
        eventId: ctx.eventId,
        expenseId: '00000000-0000-7000-8000-000000000000',
        editedBy: ctx.userId,
        paidBy: ctx.userId,
        amountEuros: 5,
        description: 'Bread',
      }),
    ).rejects.toThrow(/not found/i)
  })

  it('rejects editor not in event', async () => {
    const ctx = await setup()
    await expect(
      new EditExpenseHandler(ctx.repo).execute({
        eventId: ctx.eventId,
        expenseId: ctx.expenseId,
        editedBy: '00000000-0000-7000-8000-000000000000',
        paidBy: ctx.userId,
        amountEuros: 5,
        description: 'Bread',
      }),
    ).rejects.toThrow(/not in event/i)
  })

  it('rejects payer not in event', async () => {
    const ctx = await setup()
    await expect(
      new EditExpenseHandler(ctx.repo).execute({
        eventId: ctx.eventId,
        expenseId: ctx.expenseId,
        editedBy: ctx.userId,
        paidBy: '00000000-0000-7000-8000-000000000000',
        amountEuros: 5,
        description: 'Bread',
      }),
    ).rejects.toThrow(/not in event/i)
  })
})
