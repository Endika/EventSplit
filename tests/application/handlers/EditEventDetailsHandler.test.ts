import { describe, it, expect } from 'vitest'
import { CreateEventHandler } from '@/application/handlers/CreateEventHandler'
import { EditEventDetailsHandler } from '@/application/handlers/EditEventDetailsHandler'
import { InMemoryEventRepository } from '@/infrastructure/persistence/InMemoryEventRepository'

describe('EditEventDetailsHandler', () => {
  it('generates google maps URL from coordinates', async () => {
    const repo = new InMemoryEventRepository()
    const create = await new CreateEventHandler(repo).execute({ name: 'Trip', creatorName: 'John' })
    const result = await new EditEventDetailsHandler(repo).execute({
      eventId: create.event.id,
      location: { name: 'Casa', lat: 40.4168, lng: -3.7038 },
    })
    expect(result.event.location?.googleMapsUrl).toBe('https://maps.google.com/?q=40.4168,-3.7038')
  })

  it('generates google maps URL from address when no coords', async () => {
    const repo = new InMemoryEventRepository()
    const create = await new CreateEventHandler(repo).execute({ name: 'Trip', creatorName: 'John' })
    const result = await new EditEventDetailsHandler(repo).execute({
      eventId: create.event.id,
      location: { name: 'Casa', address: 'Calle Principal 123' },
    })
    expect(result.event.location?.googleMapsUrl).toBe(
      'https://maps.google.com/?q=Calle%20Principal%20123',
    )
  })

  it('updates wifi without touching location', async () => {
    const repo = new InMemoryEventRepository()
    const create = await new CreateEventHandler(repo).execute({ name: 'Trip', creatorName: 'John' })
    await new EditEventDetailsHandler(repo).execute({
      eventId: create.event.id,
      location: { name: 'Casa' },
    })
    const result = await new EditEventDetailsHandler(repo).execute({
      eventId: create.event.id,
      wifiPassword: 'secret123',
    })
    expect(result.event.location?.name).toBe('Casa') // unchanged
    expect(result.event.wifiPassword).toBe('secret123')
  })

  it('updates the event name', async () => {
    const repo = new InMemoryEventRepository()
    const create = await new CreateEventHandler(repo).execute({ name: 'Trip', creatorName: 'John' })
    const result = await new EditEventDetailsHandler(repo).execute({
      eventId: create.event.id,
      name: 'Mountain weekend',
    })
    expect(result.event.name).toBe('Mountain weekend')
  })

  it('does not leak the wifi password into the history log', async () => {
    const repo = new InMemoryEventRepository()
    const create = await new CreateEventHandler(repo).execute({ name: 'Trip', creatorName: 'John' })
    const result = await new EditEventDetailsHandler(repo).execute({
      eventId: create.event.id,
      wifiPassword: 'secret123',
    })
    // The history log records only who/what/when — never sensitive content.
    expect(JSON.stringify(result.event.history)).not.toContain('secret123')
  })

  const CASA = { name: 'Casa', address: 'Calle Mayor 1', lat: 43.26, lng: -2.93 }

  it.each([
    ['sets the first location', null, { location: CASA }, 'location_set', 'Location set: Casa'],
    [
      'moves to another place',
      CASA,
      { location: { ...CASA, name: 'Faro' } },
      'location_set',
      'Location set: Faro',
    ],
    [
      'saves the wifi with the same place resent',
      CASA,
      { location: CASA, wifiPassword: 'secret' },
      'notes_added',
      'Event details updated',
    ],
    [
      'renames the event',
      CASA,
      { name: 'Mountain weekend' },
      'notes_added',
      'Event details updated',
    ],
    ['removes the location', CASA, { location: null }, 'notes_added', 'Event details updated'],
  ])('logs a %s edit as what it is', async (_case, before, edit, type, description) => {
    const repo = new InMemoryEventRepository()
    const create = await new CreateEventHandler(repo).execute({ name: 'Trip', creatorName: 'John' })
    const handler = new EditEventDetailsHandler(repo)
    if (before) await handler.execute({ eventId: create.event.id, location: before })
    const result = await handler.execute({ eventId: create.event.id, ...edit })
    expect(result.event.history.at(-1)).toMatchObject({
      type,
      userId: create.event.createdBy,
      description,
    })
  })
})
