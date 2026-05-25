import { describe, it, expect } from 'vitest'
import { InMemoryEventRepository } from '@/infrastructure/persistence/InMemoryEventRepository'
import { Event } from '@/domain/entities/Event'
import { User } from '@/domain/entities/User'
import { VersionConflictError } from '@/domain/repositories/IEventRepository'

const makeEvent = () => Event.create({ name: 'Trip', creator: User.create({ name: 'John' }) })

describe('InMemoryEventRepository', () => {
  it('returns null for missing id', async () => {
    const repo = new InMemoryEventRepository()
    expect(await repo.findById('missing')).toBeNull()
  })

  it('round-trips create + findById', async () => {
    const repo = new InMemoryEventRepository()
    const e = makeEvent()
    const created = await repo.create(e.toSnapshot())
    expect(created.version).toBe(1)
    const found = await repo.findById(e.toSnapshot().id)
    expect(found?.version).toBe(1)
    expect(found?.snapshot.name).toBe('Trip')
  })

  it('rejects duplicate create', async () => {
    const repo = new InMemoryEventRepository()
    const e = makeEvent()
    await repo.create(e.toSnapshot())
    await expect(repo.create(e.toSnapshot())).rejects.toThrow(/exists/)
  })

  it('increments version on update', async () => {
    const repo = new InMemoryEventRepository()
    const e = makeEvent()
    await repo.create(e.toSnapshot())
    const next = e.addUser(User.create({ name: 'Maria' }))
    const result = await repo.update(next.toSnapshot().id, next.toSnapshot(), 1)
    expect(result.version).toBe(2)
  })

  it('throws VersionConflictError when expectedVersion does not match', async () => {
    const repo = new InMemoryEventRepository()
    const e = makeEvent()
    await repo.create(e.toSnapshot())
    await expect(repo.update(e.toSnapshot().id, e.toSnapshot(), 99)).rejects.toBeInstanceOf(
      VersionConflictError,
    )
  })
})
