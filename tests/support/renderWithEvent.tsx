import type { ReactNode } from 'react'
import { render } from '@testing-library/react'
import '@/presentation/i18n/config'
import { ContainerProvider } from '@/presentation/context/ContainerProvider'
import { EventProvider } from '@/presentation/context/EventContext'
import { UserProvider } from '@/presentation/context/UserContext'
import { WriteGuardProvider } from '@/presentation/context/WriteGuardContext'
import { EditPinProvider } from '@/presentation/context/EditPinContext'
import { SyncProvider } from '@/presentation/context/SyncContext'
import { InMemoryEventRepository } from '@/infrastructure/persistence/InMemoryEventRepository'
import type { EventSnapshot } from '@/domain/entities/Event'
import { inMemoryContainer } from './inMemoryContainer'
import { readEvent } from './readEvent'
import { Init, WhenLoaded } from './EventHarness'

/** Renders `ui` under the app's real providers over an in-memory repo holding `event`. */
export async function renderWithEvent(ui: ReactNode, event: EventSnapshot, meId: string) {
  const repo = new InMemoryEventRepository()
  await repo.create(event)
  render(
    <ContainerProvider container={inMemoryContainer(repo)}>
      <EventProvider>
        <UserProvider>
          <EditPinProvider>
            <SyncProvider>
              <WriteGuardProvider>
                <Init event={event} meId={meId} />
                <WhenLoaded>{ui}</WhenLoaded>
              </WriteGuardProvider>
            </SyncProvider>
          </EditPinProvider>
        </UserProvider>
      </EventProvider>
    </ContainerProvider>,
  )
  return {
    saved: async () => (await readEvent(repo, event.id))!.snapshot,
  }
}
