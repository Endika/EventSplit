import { describe, it, expect } from 'vitest'
import { CreateEventHandler } from '@/application/handlers/CreateEventHandler'
import { AddExpenseHandler } from '@/application/handlers/AddExpenseHandler'
import { DeleteExpenseHandler } from '@/application/handlers/DeleteExpenseHandler'
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

describe('DeleteExpenseHandler', () => {
  it('soft-deletes an expense', async () => {
    const ctx = await setup()
    const result = await new DeleteExpenseHandler(ctx.repo).execute({
      eventId: ctx.eventId,
      expenseId: ctx.expenseId,
      deletedBy: ctx.userId,
    })
    expect(result.event.expenses[0]!.deleted).toBe(true)
    expect(result.event.expenses[0]!.deletedBy).toBe(ctx.userId)
    expect(result.event.history.at(-1)?.type).toBe('expense_deleted')
  })

  it('rejects unknown expense', async () => {
    const ctx = await setup()
    await expect(
      new DeleteExpenseHandler(ctx.repo).execute({
        eventId: ctx.eventId,
        expenseId: '00000000-0000-7000-8000-000000000000',
        deletedBy: ctx.userId,
      }),
    ).rejects.toThrow(/not found/i)
  })

  it('rejects deleter not in event', async () => {
    const ctx = await setup()
    await expect(
      new DeleteExpenseHandler(ctx.repo).execute({
        eventId: ctx.eventId,
        expenseId: ctx.expenseId,
        deletedBy: '00000000-0000-7000-8000-000000000000',
      }),
    ).rejects.toThrow(/not in event/i)
  })
})
