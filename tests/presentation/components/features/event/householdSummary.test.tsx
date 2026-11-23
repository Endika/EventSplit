import { describe, it, expect, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useEffect, type ReactNode } from 'react'
import '@/presentation/i18n/config'
import { ContainerProvider } from '@/presentation/context/ContainerProvider'
import { EventProvider, useEventState } from '@/presentation/context/EventContext'
import { UserProvider, useSetCurrentUser } from '@/presentation/context/UserContext'
import { SyncProvider } from '@/presentation/context/SyncContext'
import { WriteGuardProvider } from '@/presentation/context/WriteGuardContext'
import { EditPinProvider } from '@/presentation/context/EditPinContext'
import { ExpenseSummary } from '@/presentation/components/features/event/ExpenseSummary'
import type { EventSnapshot } from '@/domain/entities/Event'
import type { UserSnapshot } from '@/domain/entities/User'

const person = (
  id: string,
  name: string,
  kind: UserSnapshot['kind'],
  guardianId: string | null = null,
  household: string | null = null,
): UserSnapshot => ({
  id,
  name,
  alias: null,
  kind,
  guardianId,
  household,
  joinedAt: '2026-01-01T00:00:00.000Z',
  email: null,
  phone: null,
  allergies: [],
  dietary: null,
  notes: null,
})

/** Ekin pays 40,00 for four. Ane and Luis are the Pérez household; Nora is Ane's daughter. */
function makeEvent(household: string | null = 'Pérez'): EventSnapshot {
  return {
    id: 'abc123x',
    name: 'Trip',
    createdBy: 'u1',
    description: null,
    location: null,
    generalNotes: null,
    wifiPassword: null,
    emergencyContact: null,
    users: [
      person('u1', 'Ekin', 'adult'),
      person('u2', 'Ane', 'adult', null, household),
      person('u3', 'Luis', 'adult', null, household),
      person('c1', 'Nora', 'child', 'u2'),
    ],
    availability: {},
    availabilityNote: null,
    chosenOptions: [],
    dayOptions: [],
    purchases: [],
    groupOrder: [],
    subgroupOrder: {},
    expenses: [
      {
        id: 'e1',
        paidBy: 'u1',
        cents: 4000,
        currency: 'EUR',
        description: 'Cena',
        purchaseId: null,
        date: '2026-06-05',
        createdAt: '2026-06-05T10:00:00.000Z',
        splitAmong: [],
        purchaseLinks: [],
        deleted: false,
        deletedBy: null,
        deletedAt: null,
      },
    ],
    hasPin: false,
    stage: 'expenses',
    settledTransfers: [],
    manualLiquidations: [],
    history: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

function Init({ event }: { event: EventSnapshot }) {
  const { setEvent } = useEventState()
  const setUser = useSetCurrentUser()
  useEffect(() => {
    setEvent(event, 1)
    setUser({ id: 'u1', name: 'Ekin', alias: null, displayName: 'Ekin' })
  }, [event, setEvent, setUser])
  return null
}

function Wrap({ event }: { event: EventSnapshot }) {
  const tree: ReactNode = (
    <>
      <Init event={event} />
      <ExpenseSummary />
    </>
  )
  return (
    <ContainerProvider>
      <EventProvider>
        <UserProvider>
          <EditPinProvider>
            <SyncProvider>
              <WriteGuardProvider>{tree}</WriteGuardProvider>
            </SyncProvider>
          </EditPinProvider>
        </UserProvider>
      </EventProvider>
    </ContainerProvider>
  )
}

describe('a household on the balance screen', () => {
  beforeEach(() => localStorage.clear())

  it('settles as one party under the household name', async () => {
    render(<Wrap event={makeEvent()} />)
    await waitFor(() => expect(screen.getByText(/Pérez pays €30.00 to Ekin/i)).toBeInTheDocument())
    expect(screen.queryByText(/Ane pays/)).not.toBeInTheDocument()
  })

  it('still lists each person, with the household in small print', async () => {
    render(<Wrap event={makeEvent()} />)
    await waitFor(() => expect(screen.getByText('Luis')).toBeInTheDocument())
    expect(screen.getByText('Ane')).toBeInTheDocument()
    expect(screen.getAllByText('Group: Pérez')).toHaveLength(2)
  })

  it('unfolds what each member contributes, children included', async () => {
    render(<Wrap event={makeEvent()} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Show breakdown' }))
    expect(screen.getByText(/Ane: -€20.00/)).toHaveTextContent('includes Nora')
    expect(screen.getByText(/Luis: -€10.00/)).not.toHaveTextContent('includes')
    fireEvent.click(screen.getByRole('button', { name: 'Hide breakdown' }))
    expect(screen.queryByText(/Luis: -€10.00/)).not.toBeInTheDocument()
  })

  it('looks like before when nobody has a household', async () => {
    render(<Wrap event={makeEvent(null)} />)
    await waitFor(() => expect(screen.getByText(/Ane pays €20.00 to Ekin/i)).toBeInTheDocument())
    expect(screen.getByText(/Luis pays €10.00 to Ekin/i)).toBeInTheDocument()
    expect(screen.queryByText(/Group:/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /breakdown/i })).not.toBeInTheDocument()
  })
})
