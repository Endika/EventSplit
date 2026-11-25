import { describe, it, expect } from 'vitest'
import { CreateEventHandler } from '@/application/handlers/CreateEventHandler'
import { EditEventDetailsHandler } from '@/application/handlers/EditEventDetailsHandler'
import { InMemoryEventRepository } from '@/infrastructure/persistence/InMemoryEventRepository'
import { lastEntry } from '../../support/world'

async function setup() {
  const repo = new InMemoryEventRepository()
  const create = await new CreateEventHandler(repo).execute({ name: 'Trip', creatorName: 'John' })
  const edit = (details: Omit<Parameters<EditEventDetailsHandler['execute']>[0], 'eventId'>) =>
    new EditEventDetailsHandler(repo).execute({ eventId: create.event.id, ...details })
  return { edit, john: create.creator.id }
}

describe('EditEventDetailsHandler', () => {
  it('stores the full location with a coordinates maps link, plus the notes fields', async () => {
    const { edit, john } = await setup()
    const result = await edit({
      name: 'Mountain weekend',
      location: {
        name: 'Casa',
        address: 'Calle Principal 123',
        lat: 40.4168,
        lng: -3.7038,
        postalCode: '28001',
      },
      generalNotes: 'Bring boots',
      wifiPassword: 'secret123',
      emergencyContact: 'Mum 600000000',
    })
    expect(result.event).toMatchObject({
      name: 'Mountain weekend',
      location: {
        name: 'Casa',
        address: 'Calle Principal 123',
        lat: 40.4168,
        lng: -3.7038,
        postalCode: '28001',
        googleMapsUrl: 'https://maps.google.com/?q=40.4168,-3.7038',
      },
      generalNotes: 'Bring boots',
      wifiPassword: 'secret123',
      emergencyContact: 'Mum 600000000',
    })
    expect(lastEntry(result.event)).toEqual({
      type: 'location_set',
      userId: john,
      description: 'Location set: Casa',
    })
  })

  it('fills the unset location fields with null and links by address when there are no coordinates', async () => {
    const { edit } = await setup()
    const result = await edit({ location: { name: 'Casa', address: 'Calle Principal 123' } })
    expect(result.event.location).toEqual({
      name: 'Casa',
      address: 'Calle Principal 123',
      lat: null,
      lng: null,
      postalCode: null,
      googleMapsUrl: 'https://maps.google.com/?q=Calle%20Principal%20123',
    })
  })

  it('keeps every field that is not sent and never logs secrets', async () => {
    const { edit, john } = await setup()
    const notesOnly = await edit({ wifiPassword: 'secret123' })
    expect(lastEntry(notesOnly.event)).toEqual({
      type: 'notes_added',
      userId: john,
      description: 'Event details updated',
    })

    await edit({
      location: { name: 'Casa' },
      generalNotes: 'Bring boots',
      emergencyContact: 'Mum 600000000',
    })
    expect((await edit({ generalNotes: 'Bring boots' })).event.wifiPassword).toBe('secret123')
    const wifiOnly = await edit({ wifiPassword: 'other456' })
    expect(wifiOnly.event).toMatchObject({
      name: 'Trip',
      location: { name: 'Casa' },
      generalNotes: 'Bring boots',
      wifiPassword: 'other456',
      emergencyContact: 'Mum 600000000',
    })
    expect(JSON.stringify(wifiOnly.event.history)).not.toMatch(/secret123|other456/)
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
