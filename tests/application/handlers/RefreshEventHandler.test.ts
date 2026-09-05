import { describe, it, expect } from 'vitest'
import { CreateEventHandler } from '@/application/handlers/CreateEventHandler'
import { RefreshEventHandler } from '@/application/handlers/RefreshEventHandler'
import { InMemoryEventRepository } from '@/infrastructure/persistence/InMemoryEventRepository'

async function setup() {
  const repo = new InMemoryEventRepository()
  const create = await new CreateEventHandler(repo).execute({ name: 'Trip', creatorName: 'John' })
  const row = (await repo.findById(create.event.id))!
  repo.findByIdCalls = 0 // reset counter after setup
  return { repo, eventId: create.event.id, snapshot: row.snapshot, version: row.version }
}

describe('RefreshEventHandler', () => {
  it('downloads the full snapshot when there is no local copy', async () => {
    const ctx = await setup()
    const result = await new RefreshEventHandler(ctx.repo).execute({
      eventId: ctx.eventId,
      local: null,
    })
    expect(result.status).toBe('updated')
    if (result.status === 'updated') {
      expect(result.version).toBe(1)
      expect(result.snapshot.id).toBe(ctx.eventId)
    }
  })

  it('returns not_found when the event does not exist and there is no local copy', async () => {
    const ctx = await setup()
    const result = await new RefreshEventHandler(ctx.repo).execute({
      eventId: '00000000-0000-7000-8000-000000000000',
      local: null,
    })
    expect(result.status).toBe('not_found')
  })

  it('skips the full download when the local copy is already current', async () => {
    const ctx = await setup()
    const result = await new RefreshEventHandler(ctx.repo).execute({
      eventId: ctx.eventId,
      local: { snapshot: ctx.snapshot, version: ctx.version },
    })
    expect(result.status).toBe('unchanged')
    expect(ctx.repo.findByIdCalls).toBe(0) // only getVersion was used → egress saved
  })

  it('downloads and returns the remote snapshot when the local copy is stale', async () => {
    const ctx = await setup()
    await ctx.repo.update(ctx.eventId, { ...ctx.snapshot, name: 'Renamed Trip' }, ctx.version, null)
    const result = await new RefreshEventHandler(ctx.repo).execute({
      eventId: ctx.eventId,
      local: { snapshot: ctx.snapshot, version: ctx.version },
    })
    expect(result.status).toBe('updated')
    if (result.status === 'updated') {
      expect(result.version).toBe(2)
      expect(result.snapshot.name).toBe('Renamed Trip')
    }
  })

  it('keeps the local copy when the remote event is gone but a local copy exists', async () => {
    const ctx = await setup()
    const result = await new RefreshEventHandler(ctx.repo).execute({
      eventId: '00000000-0000-7000-8000-000000000000',
      local: { snapshot: ctx.snapshot, version: ctx.version },
    })
    expect(result.status).toBe('unchanged')
    expect(ctx.repo.findByIdCalls).toBe(0)
  })
})
