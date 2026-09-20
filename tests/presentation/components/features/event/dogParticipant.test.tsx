import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useEffect, type ReactNode } from 'react'
import '@/presentation/i18n/config'
import { ContainerProvider } from '@/presentation/context/ContainerProvider'
import { EventProvider, useEventState } from '@/presentation/context/EventContext'
import { UserProvider, useSetCurrentUser } from '@/presentation/context/UserContext'
import { WriteGuardProvider } from '@/presentation/context/WriteGuardContext'
import { EditPinProvider } from '@/presentation/context/EditPinContext'
import { SyncProvider } from '@/presentation/context/SyncContext'
import { ExpenseSummary } from '@/presentation/components/features/event/ExpenseSummary'
import { AvailabilityTab } from '@/presentation/components/features/event/AvailabilityTab'
import { PurchaseForm } from '@/presentation/components/features/event/PurchaseForm'
import { ProfileEditor } from '@/presentation/components/features/event/ProfileEditor'
import { IdentificationModal } from '@/presentation/components/features/identification/IdentificationModal'
import type { EventSnapshot } from '@/domain/entities/Event'
import type { UserSnapshot } from '@/domain/entities/User'

const user = (
  id: string,
  name: string,
  kind: UserSnapshot['kind'],
  guardianId: string | null = null,
): UserSnapshot => ({
  id,
  name,
  guardianId,
  alias: null,
  kind,
  joinedAt: '2026-01-01T00:00:00.000Z',
  email: null,
  phone: null,
  allergies: [],
  dietary: null,
  notes: null,
})

/** Two adults and a dog. The dog attends; the dog owes nothing. */
function makeEvent(splitAmong: string[]): EventSnapshot {
  return {
    id: 'abc123x',
    name: 'Trip',
    createdBy: 'u1',
    description: null,
    location: null,
    generalNotes: null,
    wifiPassword: null,
    emergencyContact: null,
    users: [user('u1', 'Iker', 'adult'), user('u2', 'Ane', 'adult'), user('d1', 'Toby', 'dog')],
    availability: { u1: [true], u2: [true], d1: [true] },
    availabilityNote: null,
    chosenOptions: [],
    dayOptions: [{ start: '2026-06-05', end: '2026-06-05', note: null }],
    purchases: [],
    groupOrder: [],
    subgroupOrder: {},
    expenses: [
      {
        id: 'e1',
        paidBy: 'u1',
        cents: 1001,
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
    stage: 'doodle',
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
    setUser({ id: 'u1', name: 'Iker', alias: null, displayName: 'Iker' })
  }, [event, setEvent, setUser])
  return null
}

/**
 * Forms seed their local state from the event on first render, so they must not
 * mount before it is there — in the real app the event is always loaded first.
 */
function WhenLoaded({ children }: { children: ReactNode }) {
  const { event } = useEventState()
  return event ? <>{children}</> : null
}

function Wrap({ event, children }: { event: EventSnapshot; children: ReactNode }) {
  return (
    <ContainerProvider>
      <EventProvider>
        <UserProvider>
          <EditPinProvider>
            <SyncProvider>
              <WriteGuardProvider>
                <Init event={event} />
                <WhenLoaded>{children}</WhenLoaded>
              </WriteGuardProvider>
            </SyncProvider>
          </EditPinProvider>
        </UserProvider>
      </EventProvider>
    </ContainerProvider>
  )
}

const tableButton = () => screen.getByRole('button', { name: /^(tabla|table|taula|t\u00e1boa)$/i })

describe('dog participants', () => {
  beforeEach(() => {
    localStorage.clear()
    // jsdom has no layout, and switching the purchase mode scrolls the form.
    Element.prototype.scrollIntoView = vi.fn()
  })

  it('offers the child but not the dog as who brings an item', async () => {
    const event = makeEvent([])
    event.users = [...event.users, user('c1', 'Nora', 'child')]
    render(
      <Wrap event={event}>
        <PurchaseForm onDone={() => {}} />
      </Wrap>,
    )
    // The "brought by" select only exists in bring mode.
    fireEvent.click(await screen.findByRole('button', { name: /i bring it/i }))
    const select = await screen.findByRole('combobox', { name: /brought by/i })
    const options = [...select.querySelectorAll('option')].map((o) => o.textContent)
    expect(options).toContain('Nora')
    expect(options).not.toContain('Toby')
  })

  it('lets a dog stay a dog in the profile editor, and offers no way to turn a person into one', async () => {
    const event = makeEvent([])
    const { unmount } = render(
      <Wrap event={event}>
        <ProfileEditor userId="d1" onClose={() => {}} />
      </Wrap>,
    )
    const dogSelect = (await screen.findByRole('combobox', {
      name: /type/i,
    })) as HTMLSelectElement
    expect(dogSelect.value).toBe('dog')
    unmount()

    render(
      <Wrap event={event}>
        <ProfileEditor userId="u2" onClose={() => {}} />
      </Wrap>,
    )
    const humanSelect = (await screen.findByRole('combobox', {
      name: /type/i,
    })) as HTMLSelectElement
    expect(humanSelect.value).toBe('adult')
    expect([...humanSelect.querySelectorAll('option')].map((o) => o.value)).toEqual([
      'adult',
      'child',
    ])
  })

  it('never offers the dog as who you are, but still sees its name for collisions', async () => {
    const event = makeEvent([])
    render(
      <Wrap event={event}>
        <IdentificationModal eventName="Trip" users={event.users} onConfirm={async () => {}} />
      </Wrap>,
    )
    await waitFor(() => expect(screen.getByText('Iker')).toBeInTheDocument())
    expect(screen.getByText('Ane')).toBeInTheDocument()
    expect(screen.queryByText('Toby')).not.toBeInTheDocument()
  })

  it('leaves the dog out of an expense split among "everyone"', async () => {
    render(
      <Wrap event={makeEvent([])}>
        <ExpenseSummary />
      </Wrap>,
    )
    // Iker is the viewer, so they are the headline figure; the others list
    // holds everybody else who pays.
    await waitFor(() => expect(screen.getByText('Ane')).toBeInTheDocument())
    expect(screen.queryByText('Toby')).not.toBeInTheDocument()
  })

  it('ignores a dog an older build saved into splitAmong', async () => {
    render(
      <Wrap event={makeEvent(['u1', 'u2', 'd1'])}>
        <ExpenseSummary />
      </Wrap>,
    )
    // 10,01 € over two humans: the payer covers 5,01 and is owed 5,00. Split
    // over three it would have been +6,67, so the dog is provably out.
    await waitFor(() => expect(screen.getByText('+€5.00')).toBeInTheDocument())
    expect(screen.queryByText('Toby')).not.toBeInTheDocument()
    expect(screen.queryByText('+€6.67')).not.toBeInTheDocument()
  })

  it('keeps the dog out of the availability matrix even when children are shown', async () => {
    // A child makes the show-children toggle appear; that "on" branch is the one
    // this feature changed, and with it off the test would pass either way.
    const event = makeEvent([])
    event.users = [...event.users, user('c1', 'Nora', 'child')]
    render(
      <Wrap event={event}>
        <AvailabilityTab />
      </Wrap>,
    )
    // The matrix with the names lives in the table view.
    await waitFor(() => expect(tableButton()).toBeInTheDocument())
    fireEvent.click(tableButton())
    await waitFor(() => expect(screen.getByText('Iker')).toBeInTheDocument())
    expect(screen.queryByText('Nora')).not.toBeInTheDocument()
    expect(screen.queryByText('Toby')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('checkbox', { name: /nora|1/i }))
    await waitFor(() => expect(screen.getByText('Nora')).toBeInTheDocument())
    expect(screen.queryByText('Toby')).not.toBeInTheDocument()
  })

  it('does not let a dog vote left in the blob lock a day option', async () => {
    const event = makeEvent([])
    // Only the dog voted. The option must read as having no votes, which is
    // what makes it still deletable — a counted dog vote would freeze it.
    event.availability = { d1: [true] }
    render(
      <Wrap event={event}>
        <AvailabilityTab />
      </Wrap>,
    )
    await waitFor(() => expect(tableButton()).toBeInTheDocument())
    fireEvent.click(tableButton())
    await waitFor(() => expect(screen.getByText('Iker')).toBeInTheDocument())
    expect(
      screen.getByRole('button', { name: /quitar|remove|kendu|treure|eliminar/i }),
    ).toBeInTheDocument()
  })
})
