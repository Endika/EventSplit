import { describe, it, expect } from 'vitest'
import { CreateEventHandler } from '@/application/handlers/CreateEventHandler'
import { ToggleSettlementHandler } from '@/application/handlers/ToggleSettlementHandler'
import { InMemoryEventRepository } from '@/infrastructure/persistence/InMemoryEventRepository'

describe('ToggleSettlementHandler', () => {
  it('toggles a transfer on then off', async () => {
    const repo = new InMemoryEventRepository()
    const create = await new CreateEventHandler(repo).execute({ name: 'Trip', creatorName: 'John' })
    const u = create.creator.id
    const handler = new ToggleSettlementHandler(repo)

    const on = await handler.execute({ eventId: create.event.id, userId: u, from: u, to: u })
    expect(on.event.settledTransfers).toHaveLength(1)

    const off = await handler.execute({ eventId: create.event.id, userId: u, from: u, to: u })
    expect(off.event.settledTransfers).toHaveLength(0)
  })

  it('rejects unknown user', async () => {
    const repo = new InMemoryEventRepository()
    const create = await new CreateEventHandler(repo).execute({ name: 'Trip', creatorName: 'John' })
    const u = create.creator.id
    await expect(
      new ToggleSettlementHandler(repo).execute({
        eventId: create.event.id,
        userId: '00000000-0000-7000-8000-000000000000',
        from: u,
        to: u,
      }),
    ).rejects.toThrow(/not in event/i)
  })
})
