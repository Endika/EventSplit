import { describe, it, expect } from 'vitest'
import { CreateEventHandler } from '@/application/handlers/CreateEventHandler'
import { AddExpenseHandler } from '@/application/handlers/AddExpenseHandler'
import { DeleteExpenseHandler } from '@/application/handlers/DeleteExpenseHandler'
import { RecoverExpenseHandler } from '@/application/handlers/RecoverExpenseHandler'
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
  const expenseId = added.event.expenses[0]!.id
  await new DeleteExpenseHandler(repo).execute({
    eventId: create.event.id, expenseId, deletedBy: create.creator.id,
  })
  return { repo, eventId: create.event.id, userId: create.creator.id, expenseId }
}

describe('RecoverExpenseHandler', () => {
  it('recovers a deleted expense and records history', async () => {
    const ctx = await setup()
    const result = await new RecoverExpenseHandler(ctx.repo).execute({
      eventId: ctx.eventId, expenseId: ctx.expenseId, recoveredBy: ctx.userId,
    })
    expect(result.event.expenses[0]!.deleted).toBe(false)
    expect(result.event.expenses[0]!.deletedBy).toBeNull()
    expect(result.event.history.at(-1)?.type).toBe('expense_recovered')
  })

  it('rejects unknown expense', async () => {
    const ctx = await setup()
    await expect(
      new RecoverExpenseHandler(ctx.repo).execute({
        eventId: ctx.eventId, expenseId: '00000000-0000-7000-8000-000000000000', recoveredBy: ctx.userId,
      }),
    ).rejects.toThrow(/not found/i)
  })

  it('rejects recoveredBy not in event', async () => {
    const ctx = await setup()
    await expect(
      new RecoverExpenseHandler(ctx.repo).execute({
        eventId: ctx.eventId, expenseId: ctx.expenseId, recoveredBy: '00000000-0000-7000-8000-000000000000',
      }),
    ).rejects.toThrow(/not in event/i)
  })
})
