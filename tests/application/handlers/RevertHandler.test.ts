import { describe, it, expect } from 'vitest'
import { CreateEventHandler } from '@/application/handlers/CreateEventHandler'
import { AddExpenseHandler } from '@/application/handlers/AddExpenseHandler'
import { RevertHandler } from '@/application/handlers/RevertHandler'
import { InMemoryEventRepository } from '@/infrastructure/persistence/InMemoryEventRepository'

describe('RevertHandler', () => {
  it('restores event to a previous version', async () => {
    const repo = new InMemoryEventRepository()
    const create = await new CreateEventHandler(repo).execute({ name: 'Trip', creatorName: 'John' })
    const v1 = create.version

    // Add an expense (bumps to v2)
    await new AddExpenseHandler(repo).execute({
      eventId: create.event.id,
      paidBy: create.creator.id,
      amountEuros: 10,
      description: 'Bread',
    })

    // Revert to v1
    const result = await new RevertHandler(repo).execute({
      eventId: create.event.id,
      userId: create.creator.id,
      targetVersion: v1,
    })
    expect(result.event.expenses).toHaveLength(0) // back to no expenses
    expect(result.event.history.at(-1)?.type).toBe('revert')
    expect(result.event.history.length).toBeGreaterThan(2) // create + expense + revert
  })

  it('throws when target version not found', async () => {
    const repo = new InMemoryEventRepository()
    const create = await new CreateEventHandler(repo).execute({ name: 'Trip', creatorName: 'John' })
    await expect(
      new RevertHandler(repo).execute({
        eventId: create.event.id,
        userId: create.creator.id,
        targetVersion: 99,
      }),
    ).rejects.toThrow(/not found/i)
  })

  it('throws when user not in event', async () => {
    const repo = new InMemoryEventRepository()
    const create = await new CreateEventHandler(repo).execute({ name: 'Trip', creatorName: 'John' })
    await expect(
      new RevertHandler(repo).execute({
        eventId: create.event.id,
        userId: '018f4a8e-0000-7000-8000-000000000000',
        targetVersion: 1,
      }),
    ).rejects.toThrow(/not in event/i)
  })
})
