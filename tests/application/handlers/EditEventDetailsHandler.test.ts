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
})
