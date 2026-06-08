import { describe, it, expect } from 'vitest'
import { CreateEventHandler } from '@/application/handlers/CreateEventHandler'
import { SetEditPinHandler } from '@/application/handlers/SetEditPinHandler'
import { InMemoryEventRepository } from '@/infrastructure/persistence/InMemoryEventRepository'
import { WrongPinError } from '@/domain/repositories/IEventRepository'

describe('SetEditPinHandler', () => {
  it('sets a PIN server-side (never in the blob) and flips hasPin', async () => {
    const repo = new InMemoryEventRepository()
    const create = await new CreateEventHandler(repo).execute({ name: 'Trip', creatorName: 'John' })
    expect((await repo.findById(create.event.id))?.hasPin).toBe(false)

    await new SetEditPinHandler(repo).execute({
      eventId: create.event.id,
      userId: create.creator.id,
      pin: '1234',
    })

    const read = await repo.findById(create.event.id)
    expect(read?.hasPin).toBe(true)
    expect(read?.snapshot.hasPin).toBe(true)
    // The plaintext PIN never appears in the snapshot blob.
    expect(JSON.stringify(read?.snapshot)).not.toContain('1234')
    expect(await repo.verifyPin(create.event.id, '1234')).toBe(true)
  })

  it('clears the PIN when null passed (requires the current PIN)', async () => {
    const repo = new InMemoryEventRepository()
    const create = await new CreateEventHandler(repo).execute({ name: 'Trip', creatorName: 'John' })
    await new SetEditPinHandler(repo).execute({
      eventId: create.event.id,
      userId: create.creator.id,
      pin: '1234',
    })
    await new SetEditPinHandler(repo).execute({
      eventId: create.event.id,
      userId: create.creator.id,
      pin: null,
      currentPin: '1234',
    })
    expect((await repo.findById(create.event.id))?.hasPin).toBe(false)
  })

  it('requires the current PIN to change an existing PIN', async () => {
    const repo = new InMemoryEventRepository()
    const create = await new CreateEventHandler(repo).execute({ name: 'Trip', creatorName: 'John' })
    await new SetEditPinHandler(repo).execute({
      eventId: create.event.id,
      userId: create.creator.id,
      pin: '1234',
    })
    await expect(
      new SetEditPinHandler(repo).execute({
        eventId: create.event.id,
        userId: create.creator.id,
        pin: '5678',
        currentPin: '0000',
      }),
    ).rejects.toBeInstanceOf(WrongPinError)
    await new SetEditPinHandler(repo).execute({
      eventId: create.event.id,
      userId: create.creator.id,
      pin: '5678',
      currentPin: '1234',
    })
    expect(await repo.verifyPin(create.event.id, '5678')).toBe(true)
  })
})
