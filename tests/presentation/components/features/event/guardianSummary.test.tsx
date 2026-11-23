import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
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
): UserSnapshot => ({
  id,
  name,
  alias: null,
  kind,
  guardianId,
  household: null,
  joinedAt: '2026-01-01T00:00:00.000Z',
  email: null,
  phone: null,
  allergies: [],
  dietary: null,
  notes: null,
})

/** Ekin pays 30,00, split among `splitAmong` (everyone if empty). Nora is a child. */
function makeEvent(guardianId: string | null, splitAmong: string[] = []): EventSnapshot {
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
      person('u2', 'Ane', 'adult'),
      person('c1', 'Nora', 'child', guardianId),
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
        cents: 3000,
        currency: 'EUR',
        description: 'Cena',
        purchaseId: null,
        date: '2026-06-05',
        createdAt: '2026-06-05T10:00:00.000Z',
        splitAmong,
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

describe('a child in an adult’s charge, on the balance screen', () => {
  beforeEach(() => localStorage.clear())

  it('never asks the child to pay, and says who answers for her', async () => {
    render(<Wrap event={makeEvent('u1')} />)
    // 30,00 over three: Ekin is owed 20,00, of which Nora's 10,00 is his own to
    // carry, so he ends up receiving 10,00 — and Nora is in no transfer at all.
    await waitFor(() => expect(screen.getByText('+€10.00')).toBeInTheDocument())
    expect(screen.getByText(/in Ekin's charge/i)).toBeInTheDocument()
    expect(screen.queryByText(/Nora pays/i)).not.toBeInTheDocument()
    expect(screen.getByText(/Ane pays €10.00 to Ekin/i)).toBeInTheDocument()
  })

  it('leaves a child with nobody in charge settling for herself', async () => {
    render(<Wrap event={makeEvent(null)} />)
    await waitFor(() => expect(screen.getByText('+€20.00')).toBeInTheDocument())
    expect(screen.getByText(/Nora pays €10.00 to Ekin/i)).toBeInTheDocument()
  })
})

describe('the balance list', () => {
  beforeEach(() => localStorage.clear())

  it('leaves out whoever paid nothing and owes nothing, and counts them', async () => {
    render(<Wrap event={makeEvent(null, ['u1', 'u2'])} />)
    await waitFor(() => expect(screen.getByText('-€15.00')).toBeInTheDocument())
    expect(screen.queryByText('Nora')).not.toBeInTheDocument()
    expect(screen.getByText('1 more person with nothing spent or owed')).toBeInTheDocument()
  })

  it('keeps an adult at zero who carries a child’s balance', async () => {
    const event = makeEvent(null, ['u1', 'c1'])
    event.users = [...event.users.slice(0, 2), person('c1', 'Nora', 'child', 'u2')]
    render(<Wrap event={event} />)
    await waitFor(() => expect(screen.getByText(/Ane pays €15.00 to Ekin/i)).toBeInTheDocument())
    expect(screen.getByText('Ane')).toBeInTheDocument()
    expect(screen.queryByText(/nothing spent or owed/)).not.toBeInTheDocument()
  })

  it('shows everyone and no count when nobody is at zero', async () => {
    render(<Wrap event={makeEvent(null)} />)
    await waitFor(() => expect(screen.getByText('Nora')).toBeInTheDocument())
    expect(screen.queryByText(/nothing spent or owed/)).not.toBeInTheDocument()
  })
})
