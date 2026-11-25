import { afterEach, describe, it, expect, vi } from 'vitest'
import { CreateEventHandler } from '@/application/handlers/CreateEventHandler'
import { SetEventStageHandler } from '@/application/handlers/SetEventStageHandler'
import { InMemoryEventRepository } from '@/infrastructure/persistence/InMemoryEventRepository'
import { SetEditPinHandler } from '@/application/handlers/SetEditPinHandler'
import { WrongPinError } from '@/domain/repositories/IEventRepository'
import { ConflictingRepository } from '../../support/ConflictingRepository'

async function setup(conflicts = 0) {
  const inner = new InMemoryEventRepository()
  const create = await new CreateEventHandler(inner).execute({ name: 'Trip', creatorName: 'John' })
  const repo = new ConflictingRepository(inner, conflicts)
  const move = (stage: 'doodle' | 'shopping', userId = create.creator.id) =>
    new SetEventStageHandler(repo).execute({ eventId: create.event.id, userId, stage })
  return { inner, repo, move, create }
}

describe('SetEventStageHandler', () => {
  afterEach(() => vi.restoreAllMocks())

  it('returns the stored event without writing when the stage is already current', async () => {
    const { move, repo, create } = await setup()
    const result = await move('doodle')
    expect(result.version).toBe(create.version)
    expect(result.event.id).toBe(create.event.id)
    expect(repo.updateCalls).toBe(0)
  })

  it('refuses to move a PIN-protected event it cannot read', async () => {
    const { move, inner, create } = await setup()
    await new SetEditPinHandler(inner).execute({
      eventId: create.event.id,
      userId: create.creator.id,
      pin: '1234',
    })
    await expect(move('shopping')).rejects.toBeInstanceOf(WrongPinError)
  })

  it('refuses an event that does not exist', async () => {
    const { repo, create } = await setup()
    await expect(
      new SetEventStageHandler(repo).execute({
        eventId: 'zzzzzzz',
        userId: create.creator.id,
        stage: 'shopping',
      }),
    ).rejects.toThrow('Event not found')
  })

  it('retries after a version conflict and then saves', async () => {
    const { move, repo } = await setup(2)
    const result = await move('shopping')
    expect(result.event.stage).toBe('shopping')
    expect(repo.updateCalls).toBe(3)
  })

  it('gives up after 3 conflicting attempts', async () => {
    const { move, repo } = await setup(Number.POSITIVE_INFINITY)
    await expect(move('shopping')).rejects.toThrow('Could not save: too many concurrent writes')
    expect(repo.updateCalls).toBe(3)
  })

  it('rethrows any other write error at once', async () => {
    const { move, repo } = await setup()
    vi.spyOn(repo, 'update').mockRejectedValue(new Error('database exploded'))
    await expect(move('shopping')).rejects.toThrow('database exploded')
    expect(repo.update).toHaveBeenCalledTimes(1)
  })
})
