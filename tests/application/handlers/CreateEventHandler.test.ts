import { describe, it, expect } from 'vitest'
import { CreateEventHandler } from '@/application/handlers/CreateEventHandler'
import { InMemoryEventRepository } from '@/infrastructure/persistence/InMemoryEventRepository'

describe('CreateEventHandler', () => {
  it('rejects invalid input via Zod', async () => {
    const handler = new CreateEventHandler(new InMemoryEventRepository())
    await expect(handler.execute({ name: 'AB', creatorName: 'J' } as never)).rejects.toThrow()
  })

  it('creates the event and persists it', async () => {
    const repo = new InMemoryEventRepository()
    const handler = new CreateEventHandler(repo)
    const result = await handler.execute({ name: 'Mountain trip', creatorName: 'John', creatorAlias: 'cousin' })
    expect(result.event.name).toBe('Mountain trip')
    expect(result.creator.displayName).toBe('John (cousin)')
    expect(result.version).toBe(1)
    const found = await repo.findById(result.event.id)
    expect(found?.snapshot.users[0]!.name).toBe('John')
  })
})
