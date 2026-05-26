import { describe, it, expect } from 'vitest'
import { CreateEventHandler } from '@/application/handlers/CreateEventHandler'
import { AddBroughtItemHandler } from '@/application/handlers/AddBroughtItemHandler'
import { InMemoryEventRepository } from '@/infrastructure/persistence/InMemoryEventRepository'

describe('AddBroughtItemHandler', () => {
  it('adds a bring item with a bringer and group', async () => {
    const repo = new InMemoryEventRepository()
    const create = await new CreateEventHandler(repo).execute({ name: 'Trip', creatorName: 'John' })
    const creatorId = create.creator.id

    const result = await new AddBroughtItemHandler(repo).execute({
      eventId: create.event.id,
      createdBy: creatorId,
      item: 'Tortilla',
      quantity: 2,
      unit: 'units',
      group: 'Desayuno',
      broughtBy: creatorId,
    })

    expect(result.event.purchases).toHaveLength(1)
    const p = result.event.purchases[0]!
    expect(p.kind).toBe('bring')
    expect(p.assignedTo).toBe(creatorId)
    expect(p.group).toBe('Desayuno')
    expect(p.totalQuantity).toBe(2)
    expect(p.consumers).toEqual([])
    expect(result.event.history.at(-1)?.type).toBe('purchase_added')
  })

  it('rejects an unknown createdBy', async () => {
    const repo = new InMemoryEventRepository()
    const create = await new CreateEventHandler(repo).execute({ name: 'Trip', creatorName: 'John' })

    await expect(
      new AddBroughtItemHandler(repo).execute({
        eventId: create.event.id,
        createdBy: '018f4a8e-0000-7000-8000-000000000000',
        item: 'Pan',
        quantity: 1,
        unit: 'units',
      }),
    ).rejects.toThrow(/createdBy.*not in event/i)
  })
})
