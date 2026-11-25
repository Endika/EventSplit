import { describe, it, expect, beforeEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import '@/presentation/i18n/config'
import { ContainerProvider } from '@/presentation/context/ContainerProvider'
import { SyncProvider } from '@/presentation/context/SyncContext'
import { EventProvider } from '@/presentation/context/EventContext'
import { UserProvider } from '@/presentation/context/UserContext'
import { EditPinProvider } from '@/presentation/context/EditPinContext'
import { WriteGuardProvider } from '@/presentation/context/WriteGuardContext'
import { EventPage } from '@/presentation/components/features/event/EventPage'
import { CreateEventHandler } from '@/application/handlers/CreateEventHandler'
import { InMemoryEventRepository } from '@/infrastructure/persistence/InMemoryEventRepository'
import { LocalStorageCache } from '@/infrastructure/persistence/LocalStorageCache'
import { inMemoryContainer } from '../../../../support/inMemoryContainer'
import { readEvent } from '../../../../support/readEvent'

async function openFresh() {
  const repo = new InMemoryEventRepository()
  const created = await new CreateEventHandler(repo).execute({
    name: 'Casa rural',
    creatorName: 'Iker',
  })
  const id = created.event.id
  render(
    <ContainerProvider container={inMemoryContainer(repo)}>
      <SyncProvider>
        <EventProvider>
          <UserProvider>
            <EditPinProvider>
              <WriteGuardProvider>
                <EventPage eventId={id} />
              </WriteGuardProvider>
            </EditPinProvider>
          </UserProvider>
        </EventProvider>
      </SyncProvider>
    </ContainerProvider>,
  )
  return { repo, id, creator: created.creator }
}

async function showParticipants() {
  fireEvent.click((await screen.findAllByRole('button', { name: 'People' }))[0]!)
  await screen.findByRole('button', { name: /add participant/i })
}

describe('EventPage identification', () => {
  beforeEach(() => localStorage.clear())

  it('remembers the participant picked from the list and opens the event as them', async () => {
    const { id, creator } = await openFresh()
    fireEvent.click(await screen.findByRole('button', { name: 'Iker' }))

    await showParticipants()
    expect(new LocalStorageCache().getIdentity(id)).toEqual({
      id: creator.id,
      name: 'Iker',
      alias: null,
    })
    expect(screen.getByText('You')).toBeInTheDocument()
  })

  it('adds a newcomer to the event, remembers them and opens the event as them', async () => {
    const { repo, id } = await openFresh()
    fireEvent.click(await screen.findByRole('button', { name: /i'm new/i }))
    fireEvent.change(screen.getByPlaceholderText('Your name'), { target: { value: 'Ane' } })
    fireEvent.change(screen.getByPlaceholderText('Nickname (optional)'), {
      target: { value: 'Anita' },
    })
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }))

    await showParticipants()
    expect(await screen.findByText('Ane (Anita)')).toBeInTheDocument()
    const ane = (await readEvent(repo, id))!.snapshot.users.find((u) => u.name === 'Ane')!
    expect(ane.alias).toBe('Anita')
    expect(new LocalStorageCache().getIdentity(id)).toEqual({
      id: ane.id,
      name: 'Ane',
      alias: 'Anita',
    })
    expect(screen.getByText('You')).toBeInTheDocument()
  })
})
