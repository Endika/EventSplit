import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useEffect, type ReactNode } from 'react'
import '@/presentation/i18n/config'
import { ContainerProvider } from '@/presentation/context/ContainerProvider'
import { EventProvider, useEventState } from '@/presentation/context/EventContext'
import { UserProvider, useSetCurrentUser } from '@/presentation/context/UserContext'
import { EditPinProvider } from '@/presentation/context/EditPinContext'
import { WriteGuardProvider } from '@/presentation/context/WriteGuardContext'
import { CloneFromEventModal } from '@/presentation/components/features/clone/CloneFromEventModal'
import { LocalStorageCache } from '@/infrastructure/persistence/LocalStorageCache'
import type { EventSnapshot } from '@/domain/entities/Event'

function snap(id: string, over: Partial<EventSnapshot> = {}): EventSnapshot {
  return {
    id,
    name: `Event ${id}`,
    createdBy: 'u1',
    description: null,
    location: null,
    generalNotes: null,
    wifiPassword: null,
    emergencyContact: null,
    users: [
      {
        id: 'u1',
        name: 'Iker',
        alias: null,
        kind: 'adult',
        joinedAt: '2026-01-01T00:00:00.000Z',
        email: null,
        phone: null,
        allergies: [],
        dietary: null,
        notes: null,
      },
    ],
    availability: {},
    availabilityNote: null,
    chosenOptions: [],
    dayOptions: [],
    purchases: [],
    groupOrder: [],
    subgroupOrder: {},
    expenses: [],
    hasPin: false,
    stage: 'doodle',
    settledTransfers: [],
    manualLiquidations: [],
    history: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  }
}

function Init({ event }: { event: EventSnapshot }) {
  const { setEvent } = useEventState()
  const setUser = useSetCurrentUser()
  useEffect(() => {
    setEvent(event, 1)
    setUser({ id: 'u1', name: 'Iker', alias: null, displayName: 'Iker' })
  }, [event, setEvent, setUser])
  return null
}

function Wrap({ event, children }: { event: EventSnapshot; children: ReactNode }) {
  return (
    <ContainerProvider>
      <EventProvider>
        <UserProvider>
          <EditPinProvider>
            <WriteGuardProvider>
              <Init event={event} />
              {children}
            </WriteGuardProvider>
          </EditPinProvider>
        </UserProvider>
      </EventProvider>
    </ContainerProvider>
  )
}

function cacheSource(over: Partial<EventSnapshot> = {}) {
  const cache = new LocalStorageCache()
  const source = snap('src1234'.slice(0, 7), {
    name: 'Viaje anterior',
    dayOptions: [{ start: '2026-06-05', end: '2026-06-05', note: null }],
    ...over,
  })
  cache.set(source.id, { snapshot: source, version: 1 })
  cache.setIdentity(source.id, { id: 'u1', name: 'Iker', alias: null })
  return source
}

const cloneButton = () => screen.getByRole('button', { name: /^(traer|bring|ekarri|portar)$/i })

describe('CloneFromEventModal', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('says so when there is nothing to clone from', () => {
    render(
      <Wrap event={snap('tgt1234'.slice(0, 7))}>
        <CloneFromEventModal open onClose={vi.fn()} />
      </Wrap>,
    )
    expect(screen.getByText(/no tienes|you have no|ez duzu|no tens|non tes/i)).toBeInTheDocument()
  })

  it('shows the blocks only after a source is picked', async () => {
    cacheSource()
    render(
      <Wrap event={snap('tgt1234'.slice(0, 7))}>
        <CloneFromEventModal open onClose={vi.fn()} />
      </Wrap>,
    )
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
    fireEvent.click(await waitFor(() => screen.getByText('Viaje anterior')))
    expect(screen.getAllByRole('checkbox').length).toBeGreaterThan(0)
  })

  it('cannot clone with nothing ticked', async () => {
    cacheSource()
    render(
      <Wrap event={snap('tgt1234'.slice(0, 7))}>
        <CloneFromEventModal open onClose={vi.fn()} />
      </Wrap>,
    )
    fireEvent.click(await waitFor(() => screen.getByText('Viaje anterior')))
    expect(cloneButton()).toBeDisabled()
  })

  it('cannot clone before a source is picked', () => {
    cacheSource()
    render(
      <Wrap event={snap('tgt1234'.slice(0, 7))}>
        <CloneFromEventModal open onClose={vi.fn()} />
      </Wrap>,
    )
    expect(cloneButton()).toBeDisabled()
  })

  it('enables cloning once a block is ticked', async () => {
    cacheSource()
    render(
      <Wrap event={snap('tgt1234'.slice(0, 7))}>
        <CloneFromEventModal open onClose={vi.fn()} />
      </Wrap>,
    )
    fireEvent.click(await waitFor(() => screen.getByText('Viaje anterior')))
    fireEvent.click(screen.getByRole('checkbox', { name: /d(í|i)as|days|egun|dies/i }))
    expect(cloneButton()).toBeEnabled()
  })

  it('renders nothing when closed', () => {
    cacheSource()
    render(
      <Wrap event={snap('tgt1234'.slice(0, 7))}>
        <CloneFromEventModal open={false} onClose={vi.fn()} />
      </Wrap>,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('starts a fresh selection when the source changes', async () => {
    const cache = new LocalStorageCache()
    cacheSource()
    const other = snap('oth1234'.slice(0, 7), { name: 'Finde en Jaca' })
    cache.set(other.id, { snapshot: other, version: 1 })
    cache.setIdentity(other.id, { id: 'u1', name: 'Iker', alias: null })

    render(
      <Wrap event={snap('tgt1234'.slice(0, 7))}>
        <CloneFromEventModal open onClose={vi.fn()} />
      </Wrap>,
    )
    fireEvent.click(await waitFor(() => screen.getByText('Viaje anterior')))
    fireEvent.click(screen.getByRole('checkbox', { name: /d(í|i)as|days|egun|dies/i }))
    expect(cloneButton()).toBeEnabled()

    fireEvent.click(screen.getByText('Finde en Jaca'))
    expect(cloneButton()).toBeDisabled()
  })
})
