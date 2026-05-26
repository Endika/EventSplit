import { describe, it, expect } from 'vitest'
import { CreateEventHandler } from '@/application/handlers/CreateEventHandler'
import { SetEditPinHandler } from '@/application/handlers/SetEditPinHandler'
import { InMemoryEventRepository } from '@/infrastructure/persistence/InMemoryEventRepository'
import { EditPin } from '@/domain/value-objects/EditPin'

describe('SetEditPinHandler', () => {
  it('saves a hashed PIN (never the raw PIN)', async () => {
    const repo = new InMemoryEventRepository()
    const create = await new CreateEventHandler(repo).execute({ name: 'Trip', creatorName: 'John' })
    const result = await new SetEditPinHandler(repo).execute({
      eventId: create.event.id,
      userId: create.creator.id,
      pin: '1234',
    })
    expect(result.event.editPin).not.toBeNull()
    expect(result.event.editPin).not.toContain('1234')
    expect(await EditPin.verify('1234', result.event.editPin!, create.event.id)).toBe(true)
  })

  it('clears the PIN when null passed', async () => {
    const repo = new InMemoryEventRepository()
    const create = await new CreateEventHandler(repo).execute({ name: 'Trip', creatorName: 'John' })
    await new SetEditPinHandler(repo).execute({
      eventId: create.event.id,
      userId: create.creator.id,
      pin: '1234',
    })
    const cleared = await new SetEditPinHandler(repo).execute({
      eventId: create.event.id,
      userId: create.creator.id,
      pin: null,
    })
    expect(cleared.event.editPin).toBeNull()
    expect(cleared.event.history.at(-1)?.type).toBe('edit_pin_cleared')
  })

  it('rejects user not in event', async () => {
    const repo = new InMemoryEventRepository()
    const create = await new CreateEventHandler(repo).execute({ name: 'Trip', creatorName: 'John' })
    await expect(
      new SetEditPinHandler(repo).execute({
        eventId: create.event.id,
        userId: '018f4a8e-0000-7000-8000-000000000000',
        pin: '1234',
      }),
    ).rejects.toThrow(/not in event/i)
  })

  it('does not leak raw PIN into history', async () => {
    const repo = new InMemoryEventRepository()
    const create = await new CreateEventHandler(repo).execute({ name: 'Trip', creatorName: 'John' })
    const result = await new SetEditPinHandler(repo).execute({
      eventId: create.event.id,
      userId: create.creator.id,
      pin: '987654',
    })
    expect(JSON.stringify(result.event.history)).not.toContain('987654')
  })
})
