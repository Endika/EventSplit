import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import i18n from '@/presentation/i18n/config'
import { ContainerProvider } from '@/presentation/context/ContainerProvider'
import { SyncProvider } from '@/presentation/context/SyncContext'
import { EventProvider } from '@/presentation/context/EventContext'
import { UserProvider } from '@/presentation/context/UserContext'
import { EditPinProvider } from '@/presentation/context/EditPinContext'
import { WriteGuardProvider } from '@/presentation/context/WriteGuardContext'
import { EventPage } from '@/presentation/components/features/event/EventPage'
import { CreateEventHandler } from '@/application/handlers/CreateEventHandler'
import { LocalStorageCache } from '@/infrastructure/persistence/LocalStorageCache'
import type { Container } from '@/shared/di/Container'
import { inMemoryContainer } from '../../../../support/inMemoryContainer'
import { FlakyEventRepository } from '../../../../support/FlakyEventRepository'

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

function openEvent(repo: FlakyEventRepository, eventId: string) {
  return render(
    <App container={inMemoryContainer(repo)}>
      <EventPage eventId={eventId} />
    </App>,
  )
}

async function seed(repo: FlakyEventRepository, name: string) {
  const created = await new CreateEventHandler(repo).execute({ name, creatorName: 'Iker' })
  const id = created.event.id
  new LocalStorageCache().setIdentity(id, { id: created.creator.id, name: 'Iker', alias: null })
  return id
}

describe('useEventSync surfacing a failed reconcile', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })
  afterEach(() => vi.useRealTimers())

  it("shows the app's error instead of spinning forever when the first reconcile fails with no cached copy", async () => {
    const repo = new FlakyEventRepository()
    const id = await seed(repo, 'Casa rural')
    repo.failReads = true // the server is unreachable from the very first read

    openEvent(repo, id)

    expect(await screen.findByText('simulated network failure')).toBeInTheDocument()
    expect(screen.queryByText('Casa rural')).toBeNull()
  })

  it('keeps the cached copy on screen with no unhandled rejection when a background reconcile fails', async () => {
    const repo = new FlakyEventRepository()
    const id = await seed(repo, 'Casa rural')
    openEvent(repo, id)
    expect((await screen.findAllByRole('heading', { name: 'Casa rural' })).length).toBeGreaterThan(
      0,
    )

    const rejections: unknown[] = []
    const onRejection = (reason: unknown) => rejections.push(reason)
    process.on('unhandledRejection', onRejection)

    // The server goes down after the page already painted from a successful sync.
    repo.failReads = true
    window.dispatchEvent(new Event('online')) // background reconcile trigger, not the first load
    await vi.advanceTimersByTimeAsync(1000)

    process.off('unhandledRejection', onRejection)
    expect(rejections).toEqual([])
    expect(screen.getAllByRole('heading', { name: 'Casa rural' }).length).toBeGreaterThan(0)
    expect(screen.queryByText(i18n.t('errors.generic'))).toBeNull()
    expect(new LocalStorageCache().get(id)).not.toBeNull()
  })
})
