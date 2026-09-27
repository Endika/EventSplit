import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import i18n from '@/presentation/i18n/config'
import { ContainerProvider } from '@/presentation/context/ContainerProvider'
import { SyncProvider } from '@/presentation/context/SyncContext'
import { EventProvider } from '@/presentation/context/EventContext'
import { UserProvider } from '@/presentation/context/UserContext'
import { EditPinProvider } from '@/presentation/context/EditPinContext'
import { WriteGuardProvider } from '@/presentation/context/WriteGuardContext'
import { EventPage } from '@/presentation/components/features/event/EventPage'
import { HomePage } from '@/presentation/components/features/home/HomePage'
import { CreateEventHandler } from '@/application/handlers/CreateEventHandler'
import { SetEditPinHandler } from '@/application/handlers/SetEditPinHandler'
import { InMemoryEventRepository } from '@/infrastructure/persistence/InMemoryEventRepository'
import { LocalStorageCache } from '@/infrastructure/persistence/LocalStorageCache'
import type { Container } from '@/shared/di/Container'
import { UnlockedPinHolder } from '@/shared/di/UnlockedPinHolder'
import { inMemoryContainer } from '../../../../support/inMemoryContainer'
import { readEvent } from '../../../../support/readEvent'

function App({ container, children }: { container: Container; children: ReactNode }) {
  return (
    <ContainerProvider container={container}>
      <SyncProvider>
        <EventProvider>
          <UserProvider>
            <EditPinProvider>
              <WriteGuardProvider>{children}</WriteGuardProvider>
            </EditPinProvider>
          </UserProvider>
        </EventProvider>
      </SyncProvider>
    </ContainerProvider>
  )
}

/** Each call is a fresh page load: a new container, only localStorage carries over. */
function openEvent(repo: InMemoryEventRepository, eventId: string) {
  return render(
    <App container={inMemoryContainer(repo)}>
      <EventPage eventId={eventId} />
    </App>,
  )
}

async function seed(repo: InMemoryEventRepository, name: string, pin: string | null) {
  const created = await new CreateEventHandler(repo).execute({ name, creatorName: 'Iker' })
  const id = created.event.id
  if (pin) {
    await new SetEditPinHandler(repo).execute({ eventId: id, userId: created.creator.id, pin })
  }
  // Already identified here, so the page goes straight to the event once it is readable.
  new LocalStorageCache().setIdentity(id, { id: created.creator.id, name: 'Iker', alias: null })
  return id
}

const gate = () => screen.queryByText(i18n.t('pin.gateBody'))
const findGate = () => screen.findByText(i18n.t('pin.gateBody'))
const findEventHeadings = (name: string) => screen.findAllByRole('heading', { name })

async function unlock(pin: string) {
  fireEvent.change(await screen.findByPlaceholderText(i18n.t('pin.gateField')), {
    target: { value: pin },
  })
  fireEvent.click(screen.getByRole('button', { name: i18n.t('pin.gateUnlock') }))
}

describe('EventPage behind an edit PIN', () => {
  beforeEach(() => localStorage.clear())

  it('shows only the gate when this device holds no PIN, never the event', async () => {
    const repo = new InMemoryEventRepository()
    const id = await seed(repo, 'Casa rural', '1234')
    openEvent(repo, id)

    expect(await findGate()).toBeInTheDocument()
    expect(screen.queryByText('Casa rural')).toBeNull()
  })

  it('wipes the cached copy of an event that comes back locked, but keeps who you are', async () => {
    const repo = new InMemoryEventRepository()
    const created = await new CreateEventHandler(repo).execute({
      name: 'Casa rural',
      creatorName: 'Iker',
    })
    const id = created.event.id
    const cache = new LocalStorageCache()
    // Cached while the event was still open; the host sets a PIN afterwards.
    cache.set(id, { snapshot: created.event, version: created.version })
    cache.setIdentity(id, { id: created.creator.id, name: 'Iker', alias: null })
    await new SetEditPinHandler(repo).execute({
      eventId: id,
      userId: created.creator.id,
      pin: '1234',
    })

    openEvent(repo, id)

    await waitFor(() => expect(cache.get(id)).toBeNull())
    expect(await findGate()).toBeInTheDocument()
    expect(cache.listAll()).toEqual([])
    expect(cache.getIdentity(id)?.name).toBe('Iker')
  })

  it('opens the event with the right PIN and remembers it after a reload', async () => {
    const repo = new InMemoryEventRepository()
    const id = await seed(repo, 'Casa rural', '1234')
    openEvent(repo, id)

    await unlock('1234')
    expect((await findEventHeadings('Casa rural')).length).toBeGreaterThan(0)
    expect(gate()).toBeNull()

    cleanup()
    openEvent(repo, id)
    expect((await findEventHeadings('Casa rural')).length).toBeGreaterThan(0)
    expect(gate()).toBeNull()
  })

  it('keeps the gate up after a wrong PIN', async () => {
    const repo = new InMemoryEventRepository()
    const id = await seed(repo, 'Casa rural', '1234')
    openEvent(repo, id)

    await unlock('9999')
    expect(await screen.findByText(i18n.t('pin.gateWrong'))).toBeInTheDocument()
    expect(screen.queryByText('Casa rural')).toBeNull()
  })

  it('does not open a second event with the PIN remembered for the first', async () => {
    const repo = new InMemoryEventRepository()
    const first = await seed(repo, 'Casa rural', '1234')
    const second = await seed(repo, 'Cumple Ane', '5678')
    openEvent(repo, first)
    await unlock('1234')
    await findEventHeadings('Casa rural')

    cleanup()
    openEvent(repo, second)
    expect(await findGate()).toBeInTheDocument()
    expect(screen.queryByText('Cumple Ane')).toBeNull()
  })

  it('forgets the PIN and the cached copy when this device is locked', async () => {
    const repo = new InMemoryEventRepository()
    const id = await seed(repo, 'Casa rural', '1234')
    openEvent(repo, id)
    await unlock('1234')
    await findEventHeadings('Casa rural')

    fireEvent.click(screen.getAllByRole('button', { name: i18n.t('tabs.location') })[0]!)
    fireEvent.click(await screen.findByRole('button', { name: i18n.t('pin.lockDevice') }))

    expect(await findGate()).toBeInTheDocument()
    expect(new LocalStorageCache().get(id)).toBeNull()

    cleanup()
    openEvent(repo, id)
    expect(await findGate()).toBeInTheDocument()
  })

  it("waits at the gate, PIN kept, while others' wrong guesses have the event throttled", async () => {
    const repo = new InMemoryEventRepository()
    const id = await seed(repo, 'Casa rural', '1234')
    openEvent(repo, id)
    await unlock('1234')
    await findEventHeadings('Casa rural')
    cleanup()
    new LocalStorageCache().removeSnapshot(id) // a device that has to download it again
    for (let i = 0; i < 10; i++) await repo.verifyPin(id, '0000')

    openEvent(repo, id)
    expect(await findGate()).toBeInTheDocument()
    await unlock('1234')
    expect(await screen.findByText(i18n.t('pin.tooManyAttempts'))).toBeInTheDocument()
    expect(new UnlockedPinHolder().get(id)).toBe('1234')
  })

  it('drops a remembered PIN the host has since changed and shows the gate', async () => {
    const repo = new InMemoryEventRepository()
    const id = await seed(repo, 'Casa rural', '1234')
    const pins = new UnlockedPinHolder()
    pins.set(id, '1234')
    await repo.setPin(id, '5678', '1234') // changed from another device

    openEvent(repo, id)

    expect(await findGate()).toBeInTheDocument()
    await waitFor(() => expect(pins.get(id)).toBeNull())
    expect(screen.queryByText('Casa rural')).toBeNull()
  })

  it('opens a PIN-less event with no gate at all', async () => {
    const repo = new InMemoryEventRepository()
    const id = await seed(repo, 'Casa rural', null)
    openEvent(repo, id)

    expect((await findEventHeadings('Casa rural')).length).toBeGreaterThan(0)
    expect(gate()).toBeNull()
  })
})

describe('creating an event with a PIN', () => {
  beforeEach(() => localStorage.clear())

  it('keeps the creator unlocked, with the cached copy at the server version', async () => {
    const repo = new InMemoryEventRepository()
    render(
      <App container={inMemoryContainer(repo)}>
        <HomePage />
      </App>,
    )
    fireEvent.change(screen.getByPlaceholderText(i18n.t('home.eventName')), {
      target: { value: 'Casa rural' },
    })
    fireEvent.change(screen.getByPlaceholderText(i18n.t('home.yourName')), {
      target: { value: 'Iker' },
    })
    fireEvent.change(screen.getByPlaceholderText(i18n.t('pin.createField')), {
      target: { value: '1234' },
    })
    fireEvent.click(screen.getByRole('button', { name: i18n.t('home.submit') }))

    const cache = new LocalStorageCache()
    await waitFor(() => expect(cache.listAll()[0]?.id).toBeDefined())
    const id = cache.listAll()[0]!.id
    await waitFor(() => expect(cache.get(id)?.snapshot.hasPin).toBe(true))
    const server = await readEvent(repo, id, '1234')
    expect(cache.get(id)?.version).toBe(server?.version)

    cleanup()
    openEvent(repo, id)
    expect((await findEventHeadings('Casa rural')).length).toBeGreaterThan(0)
    expect(gate()).toBeNull()
  })
})
