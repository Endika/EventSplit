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

  it('rejects recovering an expense whose payer is no longer in the event', async () => {
    const repo = new InMemoryEventRepository()
    const create = await new CreateEventHandler(repo).execute({ name: 'Trip', creatorName: 'John' })
    const row = await repo.findById(create.event.id)
    if (!row) throw new Error('unexpected')
    row.snapshot.expenses.push({
      id: '01900000-0000-7000-8000-000000000098',
      paidBy: '01900000-0000-7000-8000-000000000099', // ghost — not a participant
      cents: 500,
      currency: 'EUR',
      description: 'Ghost expense',
      purchaseId: null,
      date: '2026-01-01T00:00:00Z',
      createdAt: '2026-01-01T00:00:00Z',
      splitAmong: [],
      purchaseLinks: [],
      deleted: true,
      deletedBy: create.creator.id,
      deletedAt: '2026-01-02T00:00:00Z',
    })
    await repo.update(create.event.id, row.snapshot, row.version)
    await expect(
      new RecoverExpenseHandler(repo).execute({
        eventId: create.event.id,
        expenseId: '01900000-0000-7000-8000-000000000098',
        recoveredBy: create.creator.id,
      }),
    ).rejects.toThrow(/payer is no longer/i)
  })
})
