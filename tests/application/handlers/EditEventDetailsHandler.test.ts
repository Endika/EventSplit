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

  it('does not leak wifi password into history', async () => {
    const repo = new InMemoryEventRepository()
    const create = await new CreateEventHandler(repo).execute({ name: 'Trip', creatorName: 'John' })
    const result = await new EditEventDetailsHandler(repo).execute({
      eventId: create.event.id,
      wifiPassword: 'secret123',
    })
    const lastHistory = result.event.history.at(-1)
    expect(JSON.stringify(lastHistory)).not.toContain('secret123')
  })
})
